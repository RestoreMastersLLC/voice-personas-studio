import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/config/app';
import { db } from '@/lib/db/connection';
import { voicePersonas } from '@/lib/db/schema';

interface VoiceDesignRequest {
  prompt: string;
  gender?: 'male' | 'female' | 'neutral';
  age?: 'young' | 'middle_aged' | 'old';
  accent?: 'american' | 'british' | 'australian' | 'irish';
  loudness?: number; // 0-1
  tempo?: number; // 0-1  
  texture?: number; // 0-1
  style?: number; // 0-1
}

interface VoiceDesignResponse {
  success: boolean;
  voiceId?: string;
  name?: string;
  audioUrl?: string;
  error?: string;
  warning?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<VoiceDesignResponse>> {
  try {
    console.log('[Voice Design API] Processing voice design request');

    const elevenLabsConfig = configManager.getApiConfig('elevenLabs');
    const apiKey = 'apiKey' in elevenLabsConfig ? elevenLabsConfig.apiKey : null;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'ElevenLabs API key not configured. Voice design requires ElevenLabs Pro subscription.'
      }, { status: 400 });
    }

    const {
      prompt,
      gender = 'neutral',
      age = 'middle_aged',
      accent = 'american',
      loudness = 0.5,
      tempo = 0.5,
      texture = 0.5,
      style = 0.5
    }: VoiceDesignRequest = await request.json();

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Voice description must be at least 10 characters long. Describe the voice characteristics you want.'
      }, { status: 400 });
    }

    console.log(`[Voice Design API] Creating voice with prompt: "${prompt}"`);

    // Call ElevenLabs Voice Design API (Note: This endpoint may not exist in all ElevenLabs plans)
    const designResponse = await fetch('https://api.elevenlabs.io/v1/voice-generation/generate-voice', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        voice_description: prompt,
        gender,
        age,
        accent,
        accent_strength: 1.0, // Required field - strength of accent (0.3 to 2.0)
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: style,
          use_speaker_boost: true
        },
        generation_options: {
          loudness_variation: loudness,
          tempo_variation: tempo,
          texture_variation: texture
        }
      }),
    });

    if (!designResponse.ok) {
      const errorText = await designResponse.text();
      console.error(`[Voice Design API] ElevenLabs Error: ${designResponse.status} - ${errorText}`);
      
      // Handle specific ElevenLabs errors
      if (designResponse.status === 402) {
        return NextResponse.json({
          success: false,
          error: 'Voice Design requires ElevenLabs Pro subscription. Please upgrade your ElevenLabs account.',
          warning: 'This feature is only available with ElevenLabs Pro or higher plans.'
        }, { status: 402 });
      }

      if (designResponse.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Voice Design API endpoint not available. This feature may not be supported in your ElevenLabs plan.',
          warning: 'Voice Design from text is a premium feature that may require specific ElevenLabs subscription tiers.'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: false,
        error: `Voice design failed: ${errorText}`
      }, { status: designResponse.status });
    }

    // Try to parse JSON response, handle if it's audio data instead
    let result;
    try {
      const contentType = designResponse.headers.get('content-type');
      if (contentType && contentType.includes('audio/')) {
        // If we get audio back, the endpoint might be different than expected
        console.log('[Voice Design API] Received audio response instead of JSON metadata');
        return NextResponse.json({
          success: false,
          error: 'Voice design endpoint returned audio instead of voice metadata. The API endpoint may have changed.',
          warning: 'Please check ElevenLabs documentation for the correct Voice Design API endpoint.'
        }, { status: 500 });
      }
      
      result = await designResponse.json();
    } catch (parseError) {
      console.error('[Voice Design API] Failed to parse response as JSON:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Voice design API returned unexpected response format.',
        warning: 'The Voice Design endpoint may not be available or may have changed.'
      }, { status: 500 });
    }
    console.log('[Voice Design API] Voice generation successful:', result.voice_id);

    // Generate a sample with the created voice
    const testText = "Hello! This is a preview of your newly designed voice. How does it sound?";
    
    const sampleResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${result.voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: testText,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: style,
          use_speaker_boost: true
        }
      }),
    });

    let audioUrl: string | undefined;
    if (sampleResponse.ok) {
      const audioBlob = await sampleResponse.blob();
      // For server-side, we'll create a data URL instead of blob URL
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');
      audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
      console.log('[Voice Design API] Sample audio generated successfully');
    }

    // Generate a smart name based on the prompt
    const voiceName = generateVoiceName(prompt, gender, accent);

    // Store the designed voice in our database
    try {
      await db.insert(voicePersonas).values({
        userId: 'system', // You'd get this from auth
        name: voiceName,
        region: mapAccentToRegion(accent),
        accent: accent,
        age: mapAgeToNumber(age),
        tone: extractToneFromPrompt(prompt),
        energy: extractEnergyFromPrompt(prompt, tempo),
        description: `AI-designed voice: ${prompt}`,
        avatar: generateVoiceAvatar(gender, accent),
        sampleText: testText,
        voiceSettings: JSON.stringify({
          stability: 0.75,
          similarity_boost: 0.75,
          style: style,
          use_speaker_boost: true,
          voiceId: result.voice_id,
          designPrompt: prompt,
          designParams: { gender, age, accent, loudness, tempo, texture, style }
        }),
        isDefault: false,
        isActive: true
      });

      console.log('[Voice Design API] Voice stored in database');
    } catch (dbError) {
      console.error('[Voice Design API] Database storage failed:', dbError);
      // Continue anyway, voice was created successfully
    }

    return NextResponse.json({
      success: true,
      voiceId: result.voice_id,
      name: voiceName,
      audioUrl
    });

  } catch (error) {
    console.error('[Voice Design API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Helper functions
function generateVoiceName(prompt: string, gender: string, accent: string): string {
  const words = prompt.toLowerCase().split(' ');
  const descriptors = words.filter(word => 
    ['warm', 'professional', 'friendly', 'deep', 'bright', 'smooth', 'energetic', 'calm', 'confident'].includes(word)
  );
  
  const baseNames = {
    male: ['Alex', 'Jordan', 'Cameron', 'Taylor', 'Morgan'],
    female: ['Alex', 'Jordan', 'Cameron', 'Taylor', 'Morgan'],
    neutral: ['Alex', 'Jordan', 'Cameron', 'Taylor', 'Morgan']
  };

  const accentSuffix = {
    american: 'US',
    british: 'UK', 
    australian: 'AU',
    irish: 'IE'
  };

  const baseName = baseNames[gender as keyof typeof baseNames][0];
  const descriptor = descriptors[0] || 'Voice';
  const suffix = accentSuffix[accent as keyof typeof accentSuffix];

  return `${baseName} ${descriptor.charAt(0).toUpperCase() + descriptor.slice(1)} ${suffix}`;
}

function mapAccentToRegion(accent: string): string {
  const mapping = {
    american: 'United States',
    british: 'United Kingdom',
    australian: 'Australia', 
    irish: 'Ireland'
  };
  return mapping[accent as keyof typeof mapping] || 'United States';
}

function mapAgeToNumber(age: string): number {
  const mapping = {
    young: 25,
    middle_aged: 35,
    old: 55
  };
  return mapping[age as keyof typeof mapping] || 35;
}

function extractToneFromPrompt(prompt: string): string {
  const toneWords = {
    professional: ['professional', 'business', 'corporate', 'formal'],
    warm: ['warm', 'friendly', 'caring', 'gentle', 'kind'],
    confident: ['confident', 'strong', 'assertive', 'bold'],
    calm: ['calm', 'soothing', 'peaceful', 'relaxed'],
    energetic: ['energetic', 'upbeat', 'lively', 'enthusiastic']
  };

  const lowerPrompt = prompt.toLowerCase();
  for (const [tone, words] of Object.entries(toneWords)) {
    if (words.some(word => lowerPrompt.includes(word))) {
      return tone;
    }
  }
  return 'neutral';
}

function extractEnergyFromPrompt(prompt: string, tempo: number): string {
  const energyWords = {
    high: ['energetic', 'upbeat', 'lively', 'enthusiastic', 'fast'],
    low: ['calm', 'soothing', 'peaceful', 'relaxed', 'slow'],
    medium: ['balanced', 'moderate', 'steady', 'normal']
  };

  const lowerPrompt = prompt.toLowerCase();
  for (const [energy, words] of Object.entries(energyWords)) {
    if (words.some(word => lowerPrompt.includes(word))) {
      return energy;
    }
  }

  // Fallback to tempo-based energy
  if (tempo > 0.7) return 'high';
  if (tempo < 0.3) return 'low';
  return 'medium';
}

function generateVoiceAvatar(gender: string, accent: string): string {
  const avatars = {
    male: { american: '🇺🇸', british: '🇬🇧', australian: '🇦🇺', irish: '🇮🇪' },
    female: { american: '🇺🇸', british: '🇬🇧', australian: '🇦🇺', irish: '🇮🇪' },
    neutral: { american: '🎭', british: '🎭', australian: '🎭', irish: '🎭' }
  };

  return avatars[gender as keyof typeof avatars]?.[accent as keyof typeof avatars.male] || '🎤';
} 