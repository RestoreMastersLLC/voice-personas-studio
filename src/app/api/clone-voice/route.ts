import { NextRequest, NextResponse } from 'next/server';
import { voiceCloningService } from '@/lib/services/voice-cloning.service';
import { db } from '@/lib/db/connection';
import { detectedSpeakers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('[Clone Voice API] Starting individual voice cloning');

    const { speakerId } = await request.json();
    
    if (!speakerId) {
      return NextResponse.json(
        { error: 'Speaker ID is required' },
        { status: 400 }
      );
    }

    // Get speaker information from database
    const speaker = await db.query.detectedSpeakers?.findFirst?.({
      where: eq(detectedSpeakers.speakerId, speakerId),
      with: { audioSegments: true }
    });

    if (!speaker) {
      return NextResponse.json(
        { error: 'Speaker not found' },
        { status: 404 }
      );
    }

    console.log(`[Clone Voice API] Cloning voice for speaker: ${speaker.name}`);

    // Use the enhanced voice cloning method
    const result = await voiceCloningService.cloneVoiceFromVideo(
      speaker.videoId || 'unknown-video',
      speakerId,
      speaker.name
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Voice cloning failed' },
        { status: 500 }
      );
    }

    console.log(`[Clone Voice API] Voice cloning completed for ${speaker.name}`);

    return NextResponse.json({
      success: true,
      message: `Voice cloning completed for ${speaker.name}`,
      voiceId: result.voiceId,
      personaId: result.personaId,
      similarity: result.similarity,
      characteristics: result.characteristics,
      warnings: result.warnings
    });

  } catch (error) {
    console.error('[Clone Voice API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const speakerId = searchParams.get('speakerId');

    if (!speakerId) {
      return NextResponse.json(
        { error: 'Missing speakerId parameter' },
        { status: 400 }
      );
    }

    console.log(`[Clone Voice API] Getting cloning status for speaker: ${speakerId}`);

    const status = await voiceCloningService.getCloningStatus(speakerId);

    return NextResponse.json({
      speakerId,
      status: status.status,
      voiceId: status.voiceId,
      personaId: status.personaId,
      error: status.error
    });

  } catch (error) {
    console.error('[Clone Voice API] Error getting cloning status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get cloning status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 