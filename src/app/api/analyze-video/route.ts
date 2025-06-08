import { NextRequest, NextResponse } from 'next/server';
import { speakerDetectionService } from '@/lib/services/speaker-detection.service';
import { VimeoVideo } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log('[Analyze Video API] Processing video analysis request...');
    
    const body = await request.json();
    const { video, userId } = body;

    if (!video || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: video and userId' },
        { status: 400 }
      );
    }

    // Validate video structure
    const videoData: VimeoVideo = {
      uri: video.uri,
      name: video.name,
      description: video.description || '',
      duration: video.duration || 0,
      thumbnail: video.thumbnail || '',
      link: video.link || '',
      privacy: video.privacy || '',
      tags: video.tags || [],
      stats: video.stats || {},
      created_time: video.created_time || new Date().toISOString()
    };

    console.log(`[Analyze Video API] Starting analysis for: ${videoData.name}`);

    // Start speaker detection analysis
    const analysisResult = await speakerDetectionService.analyzeVideo(videoData, userId);

    console.log(`[Analyze Video API] Analysis completed for ${videoData.name}: ${analysisResult.speakers.length} speakers detected`);

    return NextResponse.json({
      success: true,
      videoId: analysisResult.videoId,
      speakersDetected: analysisResult.speakers.length,
      totalSpeechDuration: analysisResult.totalSpeechDuration,
      backgroundNoiseLevel: analysisResult.backgroundNoiseLevel,
      qualityAssessment: analysisResult.qualityAssessment,
      speakers: analysisResult.speakers.map(speaker => ({
        id: speaker.id,
        name: speaker.name,
        accent: speaker.accent,
        qualityScore: speaker.quality_score,
        voiceCharacteristics: speaker.voice_characteristics,
        segmentCount: speaker.segments.length,
        totalSpeechTime: speaker.segments.reduce((total, seg) => total + (seg.end - seg.start), 0)
      }))
    });

  } catch (error) {
    console.error('[Analyze Video API] Error analyzing video:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 