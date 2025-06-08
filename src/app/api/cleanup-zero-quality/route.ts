import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { voicePersonas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface VoiceTestResult {
  id: string;
  name: string;
  voiceId: string;
  hasRealScores: boolean;
  overall: number;
  error?: string;
}

// Test a voice to see if it produces real quality scores
async function testVoiceQuality(voiceId: string, voiceName: string): Promise<VoiceTestResult> {
  try {
    console.log(`[Quality Test] Testing voice: ${voiceName} (${voiceId})`);

    // Generate test speech with analysis
    const testResponse = await fetch('http://localhost:3000/api/generate-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: "Quick quality test for voice validation.",
        voiceId: voiceId,
        analyzeQuality: true,
        settings: {
          stability: 0.85,
          similarity_boost: 0.95,
          style: 0.7,
          use_speaker_boost: true
        }
      })
    });

    if (!testResponse.ok) {
      return {
        id: voiceId,
        name: voiceName,
        voiceId,
        hasRealScores: false,
        overall: 0,
        error: `HTTP ${testResponse.status}`
      };
    }

    // Extract quality metrics from response headers
    const overall = parseFloat(testResponse.headers.get('X-Voice-Quality-Overall') || '0');
    const transcriptionAccuracy = parseFloat(testResponse.headers.get('X-Voice-Quality-Transcription') || '0');
    const audioClarity = parseFloat(testResponse.headers.get('X-Voice-Quality-Clarity') || '0');
    const naturalness = parseFloat(testResponse.headers.get('X-Voice-Quality-Naturalness') || '0');

    // Consider a voice "working" if it has any non-zero scores
    const hasRealScores = overall > 0 || transcriptionAccuracy > 0 || audioClarity > 0 || naturalness > 0;

    console.log(`[Quality Test] ${voiceName}: Overall=${Math.round(overall * 100)}%, Working=${hasRealScores}`);

    return {
      id: voiceId,
      name: voiceName,
      voiceId,
      hasRealScores,
      overall,
      error: hasRealScores ? undefined : 'All metrics zero'
    };

  } catch (error) {
    console.error(`[Quality Test] Error testing ${voiceName}:`, error);
    return {
      id: voiceId,
      name: voiceName,
      voiceId,
      hasRealScores: false,
      overall: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Zero Quality Cleanup] Starting analysis of voice quality...');
    
    // Get all voice personas
    const allPersonas = await db.select().from(voicePersonas);
    console.log(`[Zero Quality Cleanup] Found ${allPersonas.length} voice personas to test`);
    
    const workingVoices: VoiceTestResult[] = [];
    const brokenVoices: VoiceTestResult[] = [];
    
    // Test each voice for real quality scores
    for (const persona of allPersonas) {
      let voiceId = persona.id;
      
      // Extract voice ID from voice settings if exists
      if (persona.voiceSettings) {
        try {
          const settings = typeof persona.voiceSettings === 'string' 
            ? JSON.parse(persona.voiceSettings) 
            : persona.voiceSettings;
          if (settings.voiceId) {
            voiceId = settings.voiceId;
          }
        } catch (error) {
          console.warn(`[Zero Quality Cleanup] Could not parse voice settings for ${persona.name}`);
        }
      }
      
      const testResult = await testVoiceQuality(voiceId, persona.name);
      testResult.id = persona.id; // Use persona DB ID for deletion
      
      if (testResult.hasRealScores) {
        workingVoices.push(testResult);
      } else {
        brokenVoices.push(testResult);
      }
    }
    
    console.log(`[Zero Quality Cleanup] Analysis complete: ${workingVoices.length} working, ${brokenVoices.length} broken`);
    
    if (brokenVoices.length > 0) {
      console.log('[Zero Quality Cleanup] Deleting broken voices...');
      
      // Delete broken voices
      let deletedCount = 0;
      for (const brokenVoice of brokenVoices) {
        await db.delete(voicePersonas).where(eq(voicePersonas.id, brokenVoice.id));
        console.log(`[Zero Quality Cleanup] Deleted: ${brokenVoice.name} (${brokenVoice.error})`);
        deletedCount++;
      }
      
      console.log(`[Zero Quality Cleanup] ✅ Deleted ${deletedCount} broken voices`);
    }
    
    // Final count
    const remainingPersonas = await db.select().from(voicePersonas);
    
    return NextResponse.json({
      success: true,
      message: 'Zero quality voice cleanup completed',
      stats: {
        totalBefore: allPersonas.length,
        workingVoicesKept: workingVoices.length,
        brokenVoicesDeleted: brokenVoices.length,
        totalAfter: remainingPersonas.length
      },
      workingVoices: workingVoices.map(v => ({ 
        name: v.name, 
        voiceId: v.voiceId, 
        overall: Math.round(v.overall * 100) + '%'
      })),
      deletedVoices: brokenVoices.map(v => ({ 
        name: v.name, 
        voiceId: v.voiceId, 
        error: v.error 
      }))
    });
    
  } catch (error) {
    console.error('[Zero Quality Cleanup] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to cleanup zero quality voices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Just analyze without deleting
    const allPersonas = await db.select().from(voicePersonas);
    
    const summary = {
      total: allPersonas.length,
      withSettings: 0,
      withoutSettings: 0
    };
    
    const voiceAnalysis = [];
    
    for (const persona of allPersonas) {
      let voiceId = persona.id;
      let hasSettings = false;
      
      if (persona.voiceSettings) {
        hasSettings = true;
        summary.withSettings++;
        try {
          const settings = typeof persona.voiceSettings === 'string' 
            ? JSON.parse(persona.voiceSettings) 
            : persona.voiceSettings;
          if (settings.voiceId) {
            voiceId = settings.voiceId;
          }
        } catch (error) {
          console.warn(`Could not parse voice settings for ${persona.name}`);
        }
      } else {
        summary.withoutSettings++;
      }
      
      voiceAnalysis.push({
        id: persona.id,
        name: persona.name,
        voiceId: voiceId,
        hasSettings: hasSettings,
        isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(voiceId),
        isElevenLabsFormat: /^[A-Za-z0-9]{20}$/.test(voiceId)
      });
    }
    
    return NextResponse.json({
      success: true,
      summary,
      voices: voiceAnalysis
    });
    
  } catch (error) {
    console.error('Error analyzing zero quality voices:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze voices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 