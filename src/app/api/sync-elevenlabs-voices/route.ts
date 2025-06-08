import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/config/app';
import { db } from '@/lib/db/connection';
import { voicePersonas } from '@/lib/db/schema';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  description?: string;
  category: 'premade' | 'cloned' | 'professional' | 'generated';
  labels?: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  preview_url?: string;
  available_for_tiers?: string[];
}

interface SyncResponse {
  success: boolean;
  synced: number;
  updated: number;
  skipped: number;
  errors: number;
  voices?: Array<{
    voice_id: string;
    name: string;
    status: 'synced' | 'updated' | 'skipped' | 'error';
    reason?: string;
  }>;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest): Promise<NextResponse<SyncResponse>> {
  try {
    console.log('[Sync Voices API] Starting ElevenLabs voice synchronization');

    const elevenLabsConfig = configManager.getApiConfig('elevenLabs');
    const apiKey = 'apiKey' in elevenLabsConfig ? elevenLabsConfig.apiKey : null;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        synced: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        error: 'ElevenLabs API key not configured'
      }, { status: 400 });
    }

    // Fetch all voices from ElevenLabs
    console.log('[Sync Voices API] Fetching voices from ElevenLabs...');
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Sync Voices API] ElevenLabs Error: ${response.status} - ${errorText}`);
      return NextResponse.json({
        success: false,
        synced: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        error: `Failed to fetch voices: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    const elevenLabsVoices: ElevenLabsVoice[] = data.voices || [];
    
    console.log(`[Sync Voices API] Found ${elevenLabsVoices.length} voices in ElevenLabs`);

    // Get existing voice personas from database
    const existingPersonas = await db.select().from(voicePersonas);
    const existingVoiceIds = new Set(
      existingPersonas
        .map(p => {
          try {
            const settings = typeof p.voiceSettings === 'string' 
              ? JSON.parse(p.voiceSettings) 
              : p.voiceSettings;
            return settings?.voiceId;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );

    let synced = 0;
    const updated = 0; // Future: implement voice updates
    let skipped = 0;
    let errors = 0;
    const syncResults: Array<{
      voice_id: string;
      name: string;
      status: 'synced' | 'updated' | 'skipped' | 'error';
      reason?: string;
    }> = [];

    // Process each ElevenLabs voice
    for (const voice of elevenLabsVoices) {
      try {
        console.log(`[Sync Voices API] Processing voice: ${voice.name} (${voice.voice_id})`);

        // Check if voice already exists
        if (existingVoiceIds.has(voice.voice_id)) {
          console.log(`[Sync Voices API] Voice ${voice.name} already exists, skipping`);
          skipped++;
          syncResults.push({
            voice_id: voice.voice_id,
            name: voice.name,
            status: 'skipped',
            reason: 'Already exists in database'
          });
          continue;
        }

        // Map ElevenLabs voice to voice persona format
        const personaData = mapElevenLabsVoiceToPersona(voice);

        // Insert new voice persona
        await db.insert(voicePersonas).values(personaData);

        console.log(`[Sync Voices API] Successfully synced voice: ${voice.name}`);
        synced++;
        syncResults.push({
          voice_id: voice.voice_id,
          name: voice.name,
          status: 'synced'
        });

      } catch (error) {
        console.error(`[Sync Voices API] Error syncing voice ${voice.name}:`, error);
        errors++;
        syncResults.push({
          voice_id: voice.voice_id,
          name: voice.name,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Add small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`[Sync Voices API] Sync complete - Synced: ${synced}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      synced,
      updated,
      skipped,
      errors,
      voices: syncResults
    });

  } catch (error) {
    console.error('[Sync Voices API] Error:', error);
    return NextResponse.json({
      success: false,
      synced: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    console.log(`[Sync Voices API] ${dryRun ? 'Dry run' : 'Preview'} - checking ElevenLabs voices`);

    const elevenLabsConfig = configManager.getApiConfig('elevenLabs');
    const apiKey = 'apiKey' in elevenLabsConfig ? elevenLabsConfig.apiKey : null;

    if (!apiKey) {
      return NextResponse.json({
        error: 'ElevenLabs API key not configured'
      }, { status: 400 });
    }

    // Fetch voices from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: `Failed to fetch voices: ${response.status} - ${errorText}`
      }, { status: response.status });
    }

    const data = await response.json();
    const elevenLabsVoices: ElevenLabsVoice[] = data.voices || [];

    // Get existing voices
    const existingPersonas = await db.select().from(voicePersonas);
    const existingVoiceIds = new Set(
      existingPersonas
        .map(p => {
          try {
            const settings = typeof p.voiceSettings === 'string' 
              ? JSON.parse(p.voiceSettings) 
              : p.voiceSettings;
            return settings?.voiceId;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );

    const toSync = elevenLabsVoices.filter(voice => !existingVoiceIds.has(voice.voice_id));
    const existing = elevenLabsVoices.filter(voice => existingVoiceIds.has(voice.voice_id));

    return NextResponse.json({
      total: elevenLabsVoices.length,
      existing: existing.length,
      toSync: toSync.length,
      voices: {
        existing: existing.map(v => ({ voice_id: v.voice_id, name: v.name, category: v.category })),
        toSync: toSync.map(v => ({ voice_id: v.voice_id, name: v.name, category: v.category }))
      }
    });

  } catch (error) {
    console.error('[Sync Voices API] Preview error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Helper function to map ElevenLabs voice to voice persona format
function mapElevenLabsVoiceToPersona(voice: ElevenLabsVoice) {
  const labels = voice.labels || {};
  
  // Generate intelligent persona attributes based on voice metadata
  const accent = labels.accent || 'american';
  const age = mapAgeLabel(labels.age);
  const tone = extractToneFromDescription(voice.description || voice.name);
  const energy = extractEnergyFromCategory(voice.category);
  const region = mapAccentToRegion(accent);

  return {
    userId: '00000000-0000-0000-0000-000000000000', // System user ID for synced voices
    name: voice.name,
    region,
    accent,
    age,
    tone,
    energy,
    description: voice.description || `${voice.category} voice from ElevenLabs`,
    avatar: generateVoiceAvatar(labels.gender, accent),
    sampleText: generateSampleText(tone, accent),
    voiceSettings: JSON.stringify({
      stability: voice.settings?.stability || 0.75,
      similarity_boost: voice.settings?.similarity_boost || 0.75,
      style: voice.settings?.style || 0.3,
      use_speaker_boost: voice.settings?.use_speaker_boost || true,
      voiceId: voice.voice_id,
      category: voice.category,
      labels: labels,
      syncedFromElevenLabs: true
    }),
    isDefault: voice.category === 'premade',
    isActive: true
  };
}

function mapAgeLabel(ageLabel?: string): number {
  const ageMapping: Record<string, number> = {
    'young': 25,
    'middle aged': 35,
    'old': 55,
    'child': 12,
    'teen': 17,
    'adult': 30,
    'elderly': 65
  };
  
  if (!ageLabel) return 30;
  
  const normalizedAge = ageLabel.toLowerCase().replace('_', ' ');
  return ageMapping[normalizedAge] || 30;
}

function extractToneFromDescription(description: string): string {
  const tonePatterns = {
    professional: /professional|business|formal|corporate/i,
    warm: /warm|friendly|kind|gentle|caring/i,
    confident: /confident|strong|bold|assertive/i,
    calm: /calm|soothing|peaceful|relaxed/i,
    energetic: /energetic|upbeat|lively|enthusiastic/i,
    sophisticated: /sophisticated|elegant|refined|classy/i
  };

  for (const [tone, pattern] of Object.entries(tonePatterns)) {
    if (pattern.test(description)) {
      return tone;
    }
  }

  return 'neutral';
}

function extractEnergyFromCategory(category: string): string {
  const energyMapping: Record<string, string> = {
    'premade': 'medium',
    'cloned': 'medium',
    'professional': 'low',
    'generated': 'medium'
  };

  return energyMapping[category] || 'medium';
}

function mapAccentToRegion(accent: string): string {
  const regionMapping: Record<string, string> = {
    'american': 'United States',
    'british': 'United Kingdom', 
    'australian': 'Australia',
    'irish': 'Ireland',
    'canadian': 'Canada',
    'south african': 'South Africa',
    'indian': 'India'
  };

  return regionMapping[accent.toLowerCase()] || 'United States';
}

function generateVoiceAvatar(gender?: string, accent?: string): string {
  const genderAvatars = {
    male: '👨',
    female: '👩',
    neutral: '🎭'
  };

  const accentFlags: Record<string, string> = {
    american: '🇺🇸',
    british: '🇬🇧',
    australian: '🇦🇺',
    irish: '🇮🇪',
    canadian: '🇨🇦'
  };

  if (accent && accentFlags[accent.toLowerCase()]) {
    return accentFlags[accent.toLowerCase()];
  }

  if (gender && genderAvatars[gender.toLowerCase() as keyof typeof genderAvatars]) {
    return genderAvatars[gender.toLowerCase() as keyof typeof genderAvatars];
  }

  return '🎤';
}

function generateSampleText(tone: string, accent: string): string {
  const sampleTexts: Record<string, Record<string, string>> = {
    professional: {
      american: "Good morning. I'm here to help you navigate through today's important business matters.",
      british: "Good afternoon. I trust you'll find our discussion both informative and beneficial.",
      australian: "G'day! Let me walk you through the key points of our professional partnership."
    },
    warm: {
      american: "Hello there! I'm so glad we have this opportunity to connect and share ideas today.",
      british: "Hello! It's lovely to meet you, and I'm delighted to assist with your needs.",
      australian: "Hey there! It's great to meet you, and I'm excited to help out however I can."
    },
    confident: {
      american: "Hi! I'm confident we can tackle any challenge and achieve excellent results together.",
      british: "Hello! I'm quite certain we'll accomplish great things working together on this project.",
      australian: "Hey! I'm absolutely sure we're going to knock this out of the park together."
    }
  };

  const toneTexts = sampleTexts[tone];
  if (toneTexts && toneTexts[accent]) {
    return toneTexts[accent];
  }

  if (toneTexts && toneTexts.american) {
    return toneTexts.american;
  }

  return "Hello! I'm pleased to assist you today. Let me help you with whatever you need.";
} 