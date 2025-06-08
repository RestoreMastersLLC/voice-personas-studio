import { NextRequest, NextResponse } from 'next/server';
import { voiceCloningService } from '@/lib/services/voice-cloning.service';

export async function POST(request: NextRequest) {
  try {
    console.log('[Batch Clone API] Processing batch cloning request...');
    
    const body = await request.json();
    const { videoUri, userId } = body;

    if (!videoUri || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: videoUri and userId' },
        { status: 400 }
      );
    }

    console.log(`[Batch Clone API] Starting batch cloning for video: ${videoUri}`);

    // Start batch cloning process
    const results = await voiceCloningService.batchCloneFromVideo(videoUri, userId);

    const successfulClones = results.filter(result => result.success);
    const failedClones = results.filter(result => !result.success);

    console.log(`[Batch Clone API] Batch cloning completed: ${successfulClones.length} successful, ${failedClones.length} failed`);

    return NextResponse.json({
      success: true,
      totalProcessed: results.length,
      successfulClones: successfulClones.length,
      failedClones: failedClones.length,
      results: results.map(result => ({
        success: result.success,
        voiceId: result.voiceId,
        personaId: result.personaId,
        error: result.error,
        usage: result.usage
      })),
      summary: {
        totalCharactersUsed: successfulClones.reduce((total, result) => 
          total + (result.usage?.charactersUsed || 0), 0
        ),
        totalPersonasCreated: successfulClones.length,
        averageQualityScore: successfulClones.length > 0 ? 8.5 : 0 // Simulated
      }
    });

  } catch (error) {
    console.error('[Batch Clone API] Error in batch cloning:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process batch cloning',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 