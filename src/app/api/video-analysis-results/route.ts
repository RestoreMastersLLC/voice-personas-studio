import { NextRequest, NextResponse } from 'next/server';
import { speakerDetectionService } from '@/lib/services/speaker-detection.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUri = searchParams.get('videoUri');
    const accumulated = searchParams.get('accumulated') === 'true';

    if (!videoUri) {
      return NextResponse.json(
        { error: 'Missing videoUri parameter' },
        { status: 400 }
      );
    }

    console.log(`[Video Analysis Results API] Fetching ${accumulated ? 'accumulated' : 'current'} results for: ${videoUri}`);

    // Get detected speakers with their segments
    let speakers = await speakerDetectionService.getVideoSpeakers(videoUri);

    if (speakers.length === 0) {
      return NextResponse.json(
        { error: 'No analysis results found for this video' },
        { status: 404 }
      );
    }

    // If not accumulated, get only the most recent analysis (last 2-3 speakers by timestamp)
    if (!accumulated && speakers.length > 3) {
      // Sort by speaker ID (which contains timestamp) and take the most recent ones
      speakers = speakers
        .sort((a, b) => {
          const timeA = parseInt(a.id.split('_')[1] || '0');
          const timeB = parseInt(b.id.split('_')[1] || '0');
          return timeB - timeA; // Most recent first
        })
        .slice(0, Math.min(3, speakers.length)); // Take most recent 2-3 speakers
    }

    // Calculate total speech duration
    const totalSpeechDuration = speakers.reduce((total, speaker) => 
      total + speaker.segments.reduce((segTotal, seg) => segTotal + (seg.end - seg.start), 0), 0
    );

    console.log(`[Video Analysis Results API] Found ${speakers.length} speakers with ${speakers.reduce((total, s) => total + s.segments.length, 0)} total segments`);

    return NextResponse.json({
      success: true,
      videoId: 'video-id', // This would come from the database query
      speakers,
      totalSpeechDuration,
      backgroundNoiseLevel: 'low', // This would come from the database
      qualityAssessment: 'good' // This would come from the database
    });

  } catch (error) {
    console.error('[Video Analysis Results API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch analysis results',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
 