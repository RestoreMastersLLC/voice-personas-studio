import { NextRequest, NextResponse } from 'next/server';
import { vimeoService } from '@/lib/services/vimeo.service';
import { speakerDetectionService } from '@/lib/services/speaker-detection.service';
import { voiceFingerprintingService } from '@/lib/services/voice-fingerprinting.service';
import { aiVoiceAnalyst, type VoiceAnalysisData, type AIVoiceProfile } from '@/lib/services/ai-voice-analyst.service';
import { db } from '@/lib/db/connection';
import { vimeoVideos, detectedSpeakers } from '@/lib/db/schema';
import { eq, isNull, or } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/config/dev-constants';

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
    similarity: number;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Batch Analysis API] Starting comprehensive video analysis with voice fingerprinting');

    const { force = false, maxVideos = 20 } = await request.json();

    // Get all videos from Vimeo
    console.log('[Batch Analysis API] Fetching Vimeo videos...');
    const videosResponse = await vimeoService.getVideos(1, maxVideos);
    const allVideos = videosResponse.data || [];
    
    if (!allVideos.length) {
      return NextResponse.json({
        success: false,
        error: 'No videos found in Vimeo library'
      });
    }

    console.log(`[Batch Analysis API] Found ${allVideos.length} videos to process`);

    const progress: BatchAnalysisProgress = {
      total: allVideos.length,
      processed: 0,
      currentVideo: '',
      errors: [],
      voiceMatches: []
    };

    const results = [];

    // Process each video
    for (const video of allVideos) {
      progress.currentVideo = video.name || 'Unknown Video';
      console.log(`[Batch Analysis API] Analyzing: ${video.name}`);

      try {
        // Get current user ID
        const userId = getCurrentUserId();
        
        // Analyze speakers in the video
        const analysisResult = await speakerDetectionService.analyzeVideo(video, userId);
        
        if (analysisResult.speakers?.length > 0) {
          console.log(`[Batch Analysis API] Found ${analysisResult.speakers.length} speakers in ${video.name}`);

          // Process each detected speaker through voice fingerprinting
          for (const speaker of analysisResult.speakers) {
            try {
              // Generate voice fingerprint using speaker ID
              const voiceMatch = await voiceFingerprintingService.findVoiceMatch(
                speaker.accent || 'Unknown',
                speaker.voice_characteristics || {},
                speaker.quality_score || 0
                );

                             if (voiceMatch.matched) {
                 console.log(`[Batch Analysis API] Voice match found for ${speaker.name}`);
                  
                  // Track voice across videos
                 const match = {
                   speakerId: speaker.id,
                    name: speaker.name,
                   videoCount: 1,
                   videos: [video.name || 'Unknown'],
                   similarity: 85 // Default similarity for matched voice
                  };

                 progress.voiceMatches.push(match);
              }
            } catch (fingerprintError) {
              console.error(`[Batch Analysis API] Fingerprint error for ${speaker.name}:`, fingerprintError);
              progress.errors.push(`Fingerprint error for ${speaker.name}: ${String(fingerprintError)}`);
            }
          }

          results.push({
            video: video.name || 'Unknown Video',
            uri: video.uri || '',
            speakers: analysisResult.speakers.length,
            success: true,
            speakerNames: analysisResult.speakers.map(s => s.name || 'Unknown Speaker')
          });
        } else {
          console.log(`[Batch Analysis API] No speakers detected in ${video.name}`);
          results.push({
            video: video.name || 'Unknown Video',
            uri: video.uri || '',
            speakers: 0,
            success: true,
            speakerNames: []
          });
        }

        progress.processed++;

      } catch (videoError) {
        console.error(`[Batch Analysis API] Error analyzing ${video.name}:`, videoError);
        progress.errors.push(`Video analysis error for ${video.name}: ${String(videoError)}`);
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate comprehensive voice tracking summary
    const voiceTrackingSummary = await generateVoiceTrackingSummary();

    console.log(`[Batch Analysis API] Batch analysis complete!`);
    console.log(`[Batch Analysis API] - Videos processed: ${results.length}`);
    console.log(`[Batch Analysis API] - Cross-video voice matches: ${progress.voiceMatches.length}`);
    console.log(`[Batch Analysis API] - Total speakers detected: ${results.reduce((sum, r) => sum + r.speakers, 0)}`);

    return NextResponse.json({
      success: true,
      progress,
      results,
      voiceTrackingSummary,
      summary: {
        totalVideos: allVideos.length,
        processed: progress.processed,
        errors: progress.errors.length,
        voiceMatches: progress.voiceMatches.length,
        totalSpeakers: results.reduce((sum, r) => sum + r.speakers, 0),
        uniqueVoiceInstances: [...new Set(progress.voiceMatches.map(v => v.name))].length
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
      // Return voice tracking summary
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

// Generate comprehensive voice tracking summary
async function generateVoiceTrackingSummary() {
  try {
    console.log('[Batch Analysis API] Generating voice tracking summary...');

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
        topVoices: [],
        voiceDistribution: {}
      };
    }

    console.log(`[Batch Analysis API] Analyzing ${speakers.length} detected speakers...`);

    // Group speakers by voice characteristics (name + accent similarity)
    const voiceGroups = new Map();
    const crossVideoMatches = [];
    
    for (const speaker of speakers) {
      // Create voice signature based on multiple characteristics
      const voiceSignature = createVoiceSignature(speaker);
      
      if (!voiceGroups.has(voiceSignature)) {
        voiceGroups.set(voiceSignature, []);
      }
      voiceGroups.get(voiceSignature).push(speaker);
    }

    // Find voices that appear in multiple videos
    for (const [voiceSignature, speakerGroup] of voiceGroups) {
      if (speakerGroup.length > 1) {
        const videoIds = [...new Set(speakerGroup.map((s: any) => s.videoId))];
        const videoUris = [...new Set(speakerGroup.map((s: any) => s.videoUri || 'unknown'))];
        
        if (videoIds.length > 1 || videoUris.length > 1) {
          const avgQuality = speakerGroup.reduce((sum: number, s: any) => sum + (s.qualityScore || 0), 0) / speakerGroup.length;
          
          crossVideoMatches.push({
            voiceSignature,
            speakerName: speakerGroup[0].name,
            accent: speakerGroup[0].accent,
            videoCount: Math.max(videoIds.length, videoUris.length),
            speakerCount: speakerGroup.length,
            averageQuality: Math.round(avgQuality * 10) / 10,
            confidence: calculateVoiceMatchConfidence(speakerGroup),
            speakers: speakerGroup.map((s: any) => ({
              id: s.speakerId,
              name: s.name,
              videoId: s.videoId || 'unknown',
              quality: s.qualityScore || 0,
              segments: s.audioSegments?.length || 0
            }))
          });
        }
      }
    }

    // Sort by confidence and video count
    crossVideoMatches.sort((a, b) => 
      (b.confidence * b.videoCount * b.averageQuality) - (a.confidence * a.videoCount * a.averageQuality)
    );

    // Get top voices
    const topVoices = crossVideoMatches.slice(0, 10);

    // Voice distribution by accent
    const voiceDistribution: Record<string, number> = {};
    speakers.forEach(speaker => {
      const accent = speaker.accent || 'Unknown';
      voiceDistribution[accent] = (voiceDistribution[accent] || 0) + 1;
    });

    console.log(`[Batch Analysis API] Voice tracking summary complete:`);
    console.log(`[Batch Analysis API] - Total speakers: ${speakers.length}`);
    console.log(`[Batch Analysis API] - Unique voice groups: ${voiceGroups.size}`);
    console.log(`[Batch Analysis API] - Cross-video matches: ${crossVideoMatches.length}`);

    return {
      totalSpeakers: speakers.length,
      uniqueVoices: voiceGroups.size,
      crossVideoMatches: crossVideoMatches.length,
      topVoices,
      voiceDistribution,
      summary: {
        mostFrequentVoice: topVoices[0]?.speakerName || 'None',
        averageQuality: Math.round((speakers.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / speakers.length) * 10) / 10,
        totalVideosWithSpeakers: [...new Set(speakers.map(s => s.videoId).filter(Boolean))].length,
        highestConfidenceMatch: topVoices[0]?.confidence || 0
      }
    };

  } catch (error) {
    console.error('[Batch Analysis API] Error generating voice tracking summary:', error);
    return {
      totalSpeakers: 0,
      uniqueVoices: 0,
      crossVideoMatches: 0,
      topVoices: [],
      voiceDistribution: {},
      error: String(error)
    };
  }
}

// Create voice signature for matching
function createVoiceSignature(speaker: any): string {
  // Combine multiple characteristics to create a unique voice signature
  const name = (speaker.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const accent = (speaker.accent || 'unknown').toLowerCase();
  const characteristics = speaker.voiceCharacteristics || {};
  
  // Extract key characteristics
  const pitch = characteristics.pitch || 'medium';
  const tone = characteristics.tone || 'neutral';
  
  return `${name}_${accent}_${pitch}_${tone}`;
}

// Calculate voice match confidence
function calculateVoiceMatchConfidence(speakerGroup: any[]): number {
  if (speakerGroup.length < 2) return 0;
  
  // Base confidence on name similarity, quality, and accent consistency
  const names = speakerGroup.map(s => s.name || '');
  const accents = speakerGroup.map(s => s.accent || '');
  const qualities = speakerGroup.map(s => s.qualityScore || 0);
  
  // Name consistency score
  const uniqueNames = [...new Set(names)].length;
  const nameScore = uniqueNames === 1 ? 100 : Math.max(0, 100 - (uniqueNames - 1) * 20);
  
  // Accent consistency score
  const uniqueAccents = [...new Set(accents)].length;
  const accentScore = uniqueAccents === 1 ? 100 : Math.max(0, 100 - (uniqueAccents - 1) * 30);
  
  // Quality score
  const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
  const qualityScore = avgQuality * 10; // Convert to 0-100 scale
  
  // Combined confidence
  const confidence = (nameScore * 0.4 + accentScore * 0.3 + qualityScore * 0.3);
  
  return Math.round(confidence * 10) / 10;
}

// Get current analysis statistics
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
        ? Math.round((totalSpeakers.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / totalSpeakers.length) * 10) / 10
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