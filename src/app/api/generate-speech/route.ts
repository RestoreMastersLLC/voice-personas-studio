import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { voicePersonas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { configManager } from '@/config/app';
import { voiceQualityAnalyzer } from '@/lib/services/voice-quality-analyzer.service';

interface SpeechSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

// Direct ElevenLabs API call for speech generation
async function generateSpeechDirect(
  text: string, 
  voiceId: string, 
  settings: SpeechSettings
): Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }> {
  try {
    const elevenLabsConfig = configManager.getApiConfig('elevenLabs');
    const apiKey = 'apiKey' in elevenLabsConfig ? elevenLabsConfig.apiKey : null;

    if (!apiKey) {
      throw new Error('ElevenLabs API key not found');
    }

    console.log(`[ElevenLabs Direct] Generating speech with voice: ${voiceId}`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',    // Latest high-quality model with improved natural pacing
        voice_settings: {
          stability: settings?.stability ?? 0.90,        // Very high stability for natural pace
          similarity_boost: settings?.similarity_boost ?? 0.95,  // Maximum similarity for consistency
          style: settings?.style ?? 0.60,                // High style for emotion and volume
          use_speaker_boost: settings?.use_speaker_boost ?? true  // Enhanced volume and presence
        },
        // Add optimized generation settings for better pace
        pronunciation_dictionary_locators: [],
        seed: null,
        previous_text: null,
        next_text: null,
        previous_request_ids: [],
        next_request_ids: []
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs Direct] API Error: ${response.status} - ${errorText}`);
      throw new Error(`ElevenLabs API Error: ${response.status}`);
    }

    const audioData = await response.arrayBuffer();
    console.log(`[ElevenLabs Direct] Speech generated successfully (${audioData.byteLength} bytes)`);

    return { success: true, audioData };

  } catch (error) {
    console.error('[ElevenLabs Direct] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Generate Speech API] Processing speech generation request');

    const { text, voiceId, settings, analyzeQuality } = await request.json();
    
    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Text and voiceId are required' },
        { status: 400 }
      );
    }

    // Validate text length
    if (text.length > 2500) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 2500 characters allowed.' },
        { status: 400 }
      );
    }

    console.log(`[Generate Speech API] Generating speech for voice: ${voiceId}`);
    console.log(`[Generate Speech API] Text length: ${text.length} characters`);

    // Handle both persona IDs and ElevenLabs voice IDs
    let persona: Record<string, unknown> | null = null;
    let elevenLabsVoiceId = voiceId;

    // Check if voiceId is a UUID (persona ID) or ElevenLabs voice ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(voiceId)) {
      // It's a persona UUID - query by persona ID
      console.log(`[Generate Speech API] Looking up persona by ID: ${voiceId}`);
      try {
        const result = await db.select().from(voicePersonas).where(eq(voicePersonas.id, voiceId)).limit(1);
        persona = result[0] || null;
      } catch (error) {
        console.error('[Generate Speech API] Database query error:', error);
      }
      
      if (persona && persona.voice_settings) {
        try {
          const voiceSettings = typeof persona.voice_settings === 'string' 
            ? JSON.parse(persona.voice_settings as string) 
            : persona.voice_settings;
          
          console.log(`[Generate Speech API] Persona voice settings:`, voiceSettings);
          
          // Extract ElevenLabs voice ID from persona settings
          const extractedVoiceId = (voiceSettings as {voiceId?: string}).voiceId;
          
          if (extractedVoiceId && extractedVoiceId !== voiceId && !uuidRegex.test(extractedVoiceId)) {
            // We found a real ElevenLabs voice ID (not a UUID)
            elevenLabsVoiceId = extractedVoiceId;
            console.log(`[Generate Speech API] Extracted ElevenLabs voice ID: ${elevenLabsVoiceId}`);
          } else {
            // No valid voice ID found or it's a UUID, use fallback
            console.log(`[Generate Speech API] No valid ElevenLabs voice ID found, using fallback`);
            elevenLabsVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice as fallback
            console.log(`[Generate Speech API] Using fallback voice: ${elevenLabsVoiceId}`);
          }
        } catch (error) {
          console.error('[Generate Speech API] Error parsing voice settings:', error);
          return NextResponse.json(
            { 
              error: 'Invalid voice configuration', 
              details: 'Voice settings are corrupted. Please re-clone the voice.' 
            },
            { status: 400 }
          );
        }
      } else if (uuidRegex.test(voiceId)) {
        // Persona found but no voice settings - try to use the persona ID as fallback
        console.log(`[Generate Speech API] Persona found but no voice settings, checking for fallback options`);
        
        // Check if this is a synced ElevenLabs voice or use persona ID directly
        if (persona && (persona.voiceSettings === null || persona.voiceSettings === undefined)) {
          console.log(`[Generate Speech API] No voice settings found, attempting to use persona name as voice identifier`);
          // For synced voices without settings, try using the persona name or ID
          elevenLabsVoiceId = voiceId; // Use the persona ID as voice ID
        } else {
          return NextResponse.json(
            { 
              error: 'Voice not configured', 
              details: 'This voice persona is not properly configured. Please re-clone the voice.' 
            },
            { status: 400 }
          );
        }
      }
    } else {
      // It's an ElevenLabs voice ID - find persona that contains this voice ID
      console.log(`[Generate Speech API] Looking up persona by ElevenLabs voice ID: ${voiceId}`);
      try {
        // For ElevenLabs voice IDs, skip persona lookup and use directly
        elevenLabsVoiceId = voiceId;
        console.log(`[Generate Speech API] Using ElevenLabs voice ID directly: ${voiceId}`);
      } catch (error) {
        console.error('[Generate Speech API] Database query error:', error);
      }
    }

    // Only require persona for UUID voice IDs, allow direct ElevenLabs voice IDs
    if (!persona && uuidRegex.test(voiceId)) {
      return NextResponse.json(
        { error: 'Voice persona not found' },
        { status: 404 }
      );
    }

    // Validate that we have a proper ElevenLabs voice ID (not a UUID)
    if (uuidRegex.test(elevenLabsVoiceId)) {
      console.error(`[Generate Speech API] Invalid voice ID format: ${elevenLabsVoiceId}`);
      
      // If we have a persona, try to find a suitable fallback voice
      if (persona) {
        console.log(`[Generate Speech API] Attempting to use fallback voice for persona: ${persona.name}`);
        
        // Use a default voice as fallback (Rachel is a common ElevenLabs voice)
        elevenLabsVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice ID
        console.log(`[Generate Speech API] Using fallback voice: ${elevenLabsVoiceId}`);
      } else {
        return NextResponse.json(
          { 
            error: 'Invalid voice ID', 
            details: 'Voice is not properly configured. Please re-clone the voice to generate a valid ElevenLabs voice ID.' 
          },
          { status: 400 }
        );
      }
    }

    // Merge NATURAL settings prioritizing proper pace, volume, and emotion
    const speechSettings = {
      stability: 0.90,           // Very high stability for natural, slower pace
      similarity_boost: 0.95,    // Maximum similarity for voice consistency
      style: 0.60,               // High style for emotional expression and volume
      use_speaker_boost: true,   // Enhanced volume and presence
      ...settings
    };

    console.log(`[Generate Speech API] Using voice: ${elevenLabsVoiceId} with settings:`, speechSettings);

    // Generate speech directly using ElevenLabs API instead of service
    const speechResult = await generateSpeechDirect(text, elevenLabsVoiceId, speechSettings);

    if (!speechResult.success) {
      console.error('[Generate Speech API] Speech generation failed:', speechResult.error);
      return NextResponse.json(
        { error: speechResult.error || 'Speech generation failed' },
        { status: 500 }
      );
    }

    console.log('[Generate Speech API] Speech generated successfully');

    // Analyze quality if requested
    console.log('[Generate Speech API] analyzeQuality flag:', analyzeQuality);
    console.log('[Generate Speech API] speechResult.audioData exists:', !!speechResult.audioData);
    
    if (analyzeQuality && speechResult.audioData) {
      console.log('[Generate Speech API] Running quality analysis...');
      console.log('[Generate Speech API] Audio buffer size:', speechResult.audioData.byteLength, 'bytes');
      console.log('[Generate Speech API] Text for analysis:', text);
      
      try {
        const qualityResult = await voiceQualityAnalyzer.analyzeVoiceQuality(
          speechResult.audioData,
          text
        );
        
        if (qualityResult.success && qualityResult.metrics) {
          console.log('[Generate Speech API] Quality analysis complete:', {
            overall: qualityResult.metrics.overall,
            transcriptionAccuracy: qualityResult.metrics.transcriptionAccuracy,
            audioClarity: qualityResult.metrics.audioClarity,
            naturalness: qualityResult.metrics.naturalness,
            isProductionReady: qualityResult.metrics.isProductionReady,
            recommendations: qualityResult.metrics.recommendations
          });

          // Add quality headers for client (sanitize for HTTP header compatibility)
          const sanitizeHeader = (value: string) => {
            return Buffer.from(value).toString('base64'); // Encode to base64 for safe header transmission
          };

          const qualityHeaders = {
            'X-Voice-Quality-Overall': qualityResult.metrics.overall.toString(),
            'X-Voice-Quality-Transcription': qualityResult.metrics.transcriptionAccuracy.toString(),
            'X-Voice-Quality-Clarity': qualityResult.metrics.audioClarity.toString(),
            'X-Voice-Quality-Naturalness': qualityResult.metrics.naturalness.toString(),
            'X-Voice-Quality-Emotional': qualityResult.metrics.emotionalConsistency.toString(),
            'X-Voice-Quality-Similarity': qualityResult.metrics.similarity.toString(),
            'X-Voice-Quality-Technical': qualityResult.metrics.technicalQuality.toString(),
            'X-Voice-Quality-Production-Ready': qualityResult.metrics.isProductionReady.toString(),
            'X-Voice-Quality-Confidence': qualityResult.confidence.toString(),
            'X-Voice-Quality-Recommendations': sanitizeHeader(JSON.stringify(qualityResult.metrics.recommendations || []))
          };

          return new NextResponse(speechResult.audioData, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Disposition': 'inline; filename="speech.mp3"',
              'Cache-Control': 'public, max-age=3600',
              ...qualityHeaders
            },
          });
        }
      } catch (qualityError) {
        console.error('[Generate Speech API] Quality analysis failed:', qualityError);
        // Continue without quality analysis
      }
    }

    // Return audio directly as response
    return new NextResponse(speechResult.audioData, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="speech.mp3"',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('[Generate Speech API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const voiceId = searchParams.get('voiceId');

    if (!voiceId) {
      return NextResponse.json(
        { error: 'Missing voiceId parameter' },
        { status: 400 }
      );
    }

    // Get voice persona details for testing
    const results = await db.select().from(voicePersonas).where(eq(voicePersonas.id, voiceId)).limit(1);
    const persona = results[0] || null;

    if (!persona) {
      return NextResponse.json(
        { error: 'Voice persona not found' },
        { status: 404 }
      );
    }

    // Extract voice capabilities and settings
    const voiceSettings = persona.voiceSettings 
      ? (typeof persona.voiceSettings === 'string' 
          ? JSON.parse(persona.voiceSettings) 
          : persona.voiceSettings)
      : {};

    return NextResponse.json({
      voiceId: voiceId,
      name: persona.name,
      description: persona.description,
      accent: persona.accent,
      tone: persona.tone,
      energy: persona.energy,
      capabilities: {
        maxCharacters: 2500,
        supportedLanguages: ['en'],
        voiceSettings: {
          stability: { min: 0, max: 1, default: 0.75 },
          similarity_boost: { min: 0, max: 1, default: 0.85 },
          style: { min: 0, max: 1, default: 0.2 },
          use_speaker_boost: { default: true }
        }
      },
      currentSettings: voiceSettings,
      sampleTexts: [
        "Hello! This is a quick voice test to demonstrate my capabilities.",
        "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet.",
        "I'm excited to show you how expressive and natural I can sound! Can you hear the enthusiasm in my voice?",
        persona.sampleText || "Welcome! I'm pleased to assist you today."
      ]
    });

  } catch (error) {
    console.error('[Generate Speech API] Error getting voice info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get voice information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 