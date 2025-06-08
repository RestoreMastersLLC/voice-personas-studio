import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { voicePersonas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('[Cleanup] Starting fake voice cleanup...');
    
    // Get all voice personas
    const allPersonas = await db.select().from(voicePersonas);
    console.log(`[Cleanup] Found ${allPersonas.length} voice personas`);
    
    const fakeVoices = [];
    const realVoices = [];
    
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
          console.warn(`[Cleanup] Could not parse voice settings for ${persona.name}`);
        }
      }
      
      // Check if voice ID matches fake pattern: voice_TIMESTAMP_randomstring
      const fakePattern = /^voice_\d{13}_[a-z0-9]+$/;
      
      if (fakePattern.test(voiceId)) {
        fakeVoices.push({
          id: persona.id,
          name: persona.name,
          voiceId: voiceId
        });
      } else {
        realVoices.push({
          id: persona.id,
          name: persona.name,
          voiceId: voiceId
        });
      }
    }
    
    console.log(`[Cleanup] Analysis: ${realVoices.length} real voices, ${fakeVoices.length} fake voices`);
    
    // Delete fake voices
    let deletedCount = 0;
    for (const fakeVoice of fakeVoices) {
      await db.delete(voicePersonas).where(eq(voicePersonas.id, fakeVoice.id));
      console.log(`[Cleanup] Deleted: ${fakeVoice.name} (${fakeVoice.voiceId})`);
      deletedCount++;
    }
    
    // Final count
    const remainingPersonas = await db.select().from(voicePersonas);
    
    console.log(`[Cleanup] ✅ Cleanup complete! Deleted ${deletedCount} fake voices`);
    
    return NextResponse.json({
      success: true,
      message: 'Fake voice cleanup completed',
      stats: {
        totalBefore: allPersonas.length,
        realVoicesKept: realVoices.length,
        fakeVoicesDeleted: deletedCount,
        totalAfter: remainingPersonas.length
      },
      realVoices: realVoices.map(v => ({ name: v.name, voiceId: v.voiceId })),
      deletedVoices: fakeVoices.map(v => ({ name: v.name, voiceId: v.voiceId }))
    });
    
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to cleanup fake voices',
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
    
    const fakeVoices = [];
    const realVoices = [];
    
    for (const persona of allPersonas) {
      let voiceId = persona.id;
      
      if (persona.voiceSettings) {
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
      }
      
      const fakePattern = /^voice_\d{13}_[a-z0-9]+$/;
      
      if (fakePattern.test(voiceId)) {
        fakeVoices.push({
          id: persona.id,
          name: persona.name,
          voiceId: voiceId
        });
      } else {
        realVoices.push({
          id: persona.id,
          name: persona.name,
          voiceId: voiceId
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        totalVoices: allPersonas.length,
        realVoices: realVoices.length,
        fakeVoices: fakeVoices.length
      },
      realVoices: realVoices.map(v => ({ name: v.name, voiceId: v.voiceId })),
      fakeVoices: fakeVoices.map(v => ({ name: v.name, voiceId: v.voiceId }))
    });
    
  } catch (error) {
    console.error('Error analyzing voices:', error);
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