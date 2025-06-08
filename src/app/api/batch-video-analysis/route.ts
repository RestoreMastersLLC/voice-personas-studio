import { NextRequest, NextResponse } from 'next/server';
import { vimeoService } from '@/lib/services/vimeo.service';
import { speakerDetectionService } from '@/lib/services/speaker-detection.service';
import { voiceFingerprintingService } from '@/lib/services/voice-fingerprinting.service';
import { db } from '@/lib/db/connection';
import { vimeoVideos, detectedSpeakers } from '@/lib/db/schema';
import { eq, isNull, or } from 'drizzle-orm';

interface BatchAnalysisProgress {
  total: number;
  processed: number;
  currentVideo: string;
  errors: string[];
  voiceMatches: {
    speakerId: string;
    name: string;
    videoCount: number;
    videos: string[];
  }[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Batch Analysis API] Starting comprehensive video analysis');

    const { force = false, maxVideos = 50 } = await request.json();

    // Get all videos from Vimeo
    console.log('[Batch Analysis API] Fetching all Vimeo videos...');
    const allVideos = await vimeoService.getAllVideos();
    
    if (!allVideos.length) {
      return NextResponse.json({
        success: false,
        error: 'No videos found in Vimeo library'
      });
    }

    console.log(`[Batch Analysis API] Found ${allVideos.length} videos total`);

    // Filter videos that need analysis (not analyzed or force reanalysis)
    const videosToAnalyze = force 
      ? allVideos.slice(0, maxVideos)
      : await getUnanalyzedVideos(allVideos, maxVideos);

    console.log(`[Batch Analysis API] Will analyze ${videosToAnalyze.length} videos`);

    const progress: BatchAnalysisProgress = {
      total: videosToAnalyze.length,
      processed: 0,
      currentVideo: '',
      errors: [],
      voiceMatches: []
    };

    // Process videos in batches to avoid memory issues
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < videosToAnalyze.length; i += batchSize) {
      const batch = videosToAnalyze.slice(i, i + batchSize);
      
      console.log(`[Batch Analysis API] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(videosToAnalyze.length/batchSize)}`);

      for (const video of batch) {
        progress.currentVideo = video.name;
        console.log(`[Batch Analysis API] Analyzing: ${video.name}`);

        try {
          // Analyze speakers in the video
          const analysisResult = await speakerDetectionService.analyzeVideo(video.uri);
          
          if (analysisResult.success && analysisResult.speakers.length > 0) {
            console.log(`[Batch Analysis API] Found ${analysisResult.speakers.length} speakers in ${video.name}`);

            // Process each detected speaker through voice fingerprinting
            for (const speaker of analysisResult.speakers) {
              try {
                // Generate voice fingerprint and find matches
                const fingerprintResult = await voiceFingerprintingService.generateSpeakerFingerprint(
                  speaker.speakerId
                );

                if (fingerprintResult.success) {
                  // Find cross-video matches
                  const matches = await voiceFingerprintingService.findVoiceMatches(
                    fingerprintResult.fingerprint,
                    0.75 // 75% similarity threshold
                  );

                  if (matches.length > 0) {
                    console.log(`[Batch Analysis API] Voice fingerprint match found for ${speaker.name}`);
                    
                    // Update progress with voice matches
                    const existingMatch = progress.voiceMatches.find(m => m.speakerId === speaker.speakerId);
                    if (existingMatch) {
                      existingMatch.videoCount++;
                      existingMatch.videos.push(video.name);
                    } else {
                      progress.voiceMatches.push({
                        speakerId: speaker.speakerId,
                        name: speaker.name,
                        videoCount: 1,
                        videos: [video.name]
                      });
                    }
                  }
                }
              } catch (fingerprintError) {
                console.error(`[Batch Analysis API] Fingerprint error for ${speaker.name}:`, fingerprintError);
                progress.errors.push(`Fingerprint error for ${speaker.name}: ${fingerprintError}`);
              }
            }

            results.push({
              video: video.name,
              uri: video.uri,
              speakers: analysisResult.speakers.length,
              success: true
            });
          } else {
            console.log(`[Batch Analysis API] No speakers detected in ${video.name}`);
            results.push({
              video: video.name,
              uri: video.uri,
              speakers: 0,
              success: true
            });
          }

          progress.processed++;

        } catch (videoError) {
          console.error(`[Batch Analysis API] Error analyzing ${video.name}:`, videoError);
          progress.errors.push(`Video analysis error for ${video.name}: ${videoError}`);
          results.push({
            video: video.name,
            uri: video.uri,
            speakers: 0,
            success: false,
            error: String(videoError)
          });
          progress.processed++;
        }

        // Add delay between videos to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate voice tracking summary
    const voiceTrackingSummary = await generateVoiceTrackingSummary();

    console.log(`[Batch Analysis API] Batch analysis complete: ${results.length} videos processed`);
    console.log(`[Batch Analysis API] Found ${progress.voiceMatches.length} cross-video voice matches`);

    return NextResponse.json({
      success: true,
      progress,
      results,
      voiceTrackingSummary,
      summary: {
        totalVideos: videosToAnalyze.length,
        processed: progress.processed,
        errors: progress.errors.length,
        voiceMatches: progress.voiceMatches.length,
        totalSpeakers: results.reduce((sum, r) => sum + r.speakers, 0)
      }
    });

  } catch (error) {
    console.error('[Batch Analysis API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch analysis failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get('summary') === 'true';

    if (summary) {
      // Return analysis summary
      const voiceTrackingSummary = await generateVoiceTrackingSummary();
      
      return NextResponse.json({
        success: true,
        voiceTrackingSummary
      });
    }

    // Return current analysis status
    const stats = await getAnalysisStats();
    
    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[Batch Analysis API] Error getting status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status'
    }, { status: 500 });
  }
}

// Helper functions
async function getUnanalyzedVideos(allVideos: any[], maxVideos: number) {
  try {
    // Get videos that don't have analysis records or have incomplete analysis
    const analyzedVideoUris = await db.query.vimeoVideos?.findMany?.({
      where: or(
        isNull(vimeoVideos.analysisStatus),
        eq(vimeoVideos.analysisStatus, 'pending'),
        eq(vimeoVideos.speakersDetected, 0)
      )
    });

    const analyzedUris = new Set(analyzedVideoUris?.map(v => v.vimeoUri) || []);

    // Filter out already analyzed videos
    const unanalyzed = allVideos.filter(video => 
      !analyzedUris.has(video.uri) || analyzedUris.has(video.uri)
    );

    return unanalyzed.slice(0, maxVideos);

  } catch (error) {
    console.error('[Batch Analysis API] Error filtering videos:', error);
    // Fallback: return first N videos
    return allVideos.slice(0, maxVideos);
  }
}

async function generateVoiceTrackingSummary() {
  try {
    // Get all detected speakers with their video information
    const speakers = await db.query.detectedSpeakers?.findMany?.({
      with: {
        audioSegments: true
      }
    });

    if (!speakers?.length) {
      return {
        totalSpeakers: 0,
        uniqueVoices: 0,
        crossVideoMatches: [],
        topVoices: []
      };
    }

    // Group speakers by voice fingerprint/similarity
    const voiceGroups = new Map();
    const crossVideoMatches = [];
    
    for (const speaker of speakers) {
      // Use voice characteristics to group similar voices
      const voiceKey = `${speaker.accent}_${speaker.name}`;
      
      if (!voiceGroups.has(voiceKey)) {
        voiceGroups.set(voiceKey, []);
      }
      voiceGroups.get(voiceKey).push(speaker);
    }

    // Find voices that appear in multiple videos
    for (const [voiceKey, speakerGroup] of voiceGroups) {
      if (speakerGroup.length > 1) {
        const videoIds = [...new Set(speakerGroup.map((s: any) => s.videoId))];
        if (videoIds.length > 1) {
          crossVideoMatches.push({
            voiceKey,
            speakerName: speakerGroup[0].name,
            accent: speakerGroup[0].accent,
            videoCount: videoIds.length,
            speakerCount: speakerGroup.length,
            averageQuality: speakerGroup.reduce((sum: number, s: any) => sum + s.qualityScore, 0) / speakerGroup.length,
            speakers: speakerGroup.map((s: any) => ({
              id: s.speakerId,
              name: s.name,
              videoId: s.videoId,
              quality: s.qualityScore
            }))
          });
        }
      }
    }

    // Get top voices by quality and frequency
    const topVoices = crossVideoMatches
      .sort((a, b) => (b.videoCount * b.averageQuality) - (a.videoCount * a.averageQuality))
      .slice(0, 10);

    return {
      totalSpeakers: speakers.length,
      uniqueVoices: voiceGroups.size,
      crossVideoMatches: crossVideoMatches.length,
      topVoices,
      summary: {
        mostFrequentVoice: topVoices[0]?.speakerName || 'None',
        averageQuality: speakers.reduce((sum, s) => sum + s.qualityScore, 0) / speakers.length,
        totalVideosWithSpeakers: [...new Set(speakers.map(s => s.videoId))].length
      }
    };

  } catch (error) {
    console.error('[Batch Analysis API] Error generating voice tracking summary:', error);
    return {
      totalSpeakers: 0,
      uniqueVoices: 0,
      crossVideoMatches: [],
      topVoices: [],
      error: String(error)
    };
  }
}

async function getAnalysisStats() {
  try {
    const totalVideos = await db.query.vimeoVideos?.findMany?.() || [];
    const analyzedVideos = await db.query.vimeoVideos?.findMany?.({
      where: eq(vimeoVideos.analysisStatus, 'completed')
    }) || [];
    const totalSpeakers = await db.query.detectedSpeakers?.findMany?.() || [];

    return {
      totalVideos: totalVideos.length,
      analyzedVideos: analyzedVideos.length,
      pendingVideos: totalVideos.length - analyzedVideos.length,
      totalSpeakers: totalSpeakers.length,
      averageQuality: totalSpeakers.length > 0 
        ? totalSpeakers.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / totalSpeakers.length 
        : 0
    };

  } catch (error) {
    console.error('[Batch Analysis API] Error getting stats:', error);
    return {
      totalVideos: 0,
      analyzedVideos: 0,
      pendingVideos: 0,
      totalSpeakers: 0,
      averageQuality: 0,
      error: String(error)
    };
  }
} 