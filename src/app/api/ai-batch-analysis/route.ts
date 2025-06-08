import { NextRequest, NextResponse } from 'next/server';
import { vimeoService } from '@/lib/services/vimeo.service';
import { speakerDetectionService } from '@/lib/services/speaker-detection.service';
import { aiVoiceAnalyst, type VoiceAnalysisData, type AIVoiceProfile } from '@/lib/services/ai-voice-analyst.service';

interface AIBatchAnalysisProgress {
  total: number;
  processed: number;
  currentVideo: string;
  errors: string[];
  aiInsights: {
    uniqueSpeakers: number;
    crossVideoMatches: number;
    expertiseAreas: string[];
    qualityDistribution: {
      excellent: number;
      good: number;
      fair: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('[AI Batch Analysis] Starting Claude Sonnet 4 enhanced video analysis');

    const { maxVideos = 15 } = await request.json();

    // Get Vimeo videos
    console.log('[AI Batch Analysis] Fetching videos from Vimeo...');
    const videosResponse = await vimeoService.getVideos(1, maxVideos);
    
    if (!videosResponse?.data?.length) {
      return NextResponse.json({
        success: false,
        error: 'No videos found in Vimeo library'
      });
    }

    const videos = videosResponse.data;
    console.log(`[AI Batch Analysis] Found ${videos.length} videos to analyze with AI`);

    const progress: AIBatchAnalysisProgress = {
      total: videos.length,
      processed: 0,
      currentVideo: '',
      errors: [],
      aiInsights: {
        uniqueSpeakers: 0,
        crossVideoMatches: 0,
        expertiseAreas: [],
        qualityDistribution: { excellent: 0, good: 0, fair: 0 }
      }
    };

    const allVoiceData: VoiceAnalysisData[] = [];
    const results = [];

    // Phase 1: Extract and analyze speakers from each video
    for (const video of videos) {
      progress.currentVideo = video.name;
      console.log(`[AI Batch Analysis] Processing: ${video.name}`);

      try {
        // Get speakers for this video  
        const speakerResult = await speakerDetectionService.analyzeVideo(video, '550e8400-e29b-41d4-a716-446655440000');
        
        if (speakerResult.speakers?.length > 0) {
          console.log(`[AI Batch Analysis] Found ${speakerResult.speakers.length} speakers in ${video.name}`);

          // Convert speakers to AI analysis format
          for (const speaker of speakerResult.speakers) {
            const voiceData: VoiceAnalysisData = {
              speakerId: speaker.id || `${video.uri}_${speaker.name}`,
              name: speaker.name || `Speaker from ${video.name}`,
              audioSegments: [
                {
                  text: `Sample speech from ${speaker.name || 'Unknown Speaker'}`,
                  duration: 30,
                  quality: 8,
                  timestamp: 0
                }
              ],
              basicCharacteristics: {
                accent: 'General American',
                tone: 'Professional', 
                energy: 'Medium',
                pace: 140,
                pitch: 180
              },
              videoContext: {
                videoName: video.name,
                videoType: determineVideoType(video.name),
                topics: extractTopics(video.name)
              }
            };

            allVoiceData.push(voiceData);
          }

          results.push({
            video: video.name,
            uri: video.uri,
            speakers: speakerResult.speakers.length,
            success: true,
            speakerNames: speakerResult.speakers.map(s => s.name)
          });
        } else {
          console.log(`[AI Batch Analysis] No speakers detected in ${video.name}`);
          results.push({
            video: video.name,
            uri: video.uri,
            speakers: 0,
            success: true,
            speakerNames: []
          });
        }

        progress.processed++;

      } catch (videoError) {
        console.error(`[AI Batch Analysis] Error processing ${video.name}:`, videoError);
        progress.errors.push(`Video error for ${video.name}: ${String(videoError)}`);
        results.push({
          video: video.name,
          uri: video.uri,
          speakers: 0,
          success: false,
          error: String(videoError)
        });
        progress.processed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Phase 2: AI Analysis with Claude Sonnet 4
    console.log(`[AI Batch Analysis] Starting AI analysis of ${allVoiceData.length} voice samples...`);
    
    const aiProfiles: AIVoiceProfile[] = [];
    let aiProcessed = 0;

    for (const voiceData of allVoiceData) {
      try {
        console.log(`[AI Batch Analysis] AI analyzing: ${voiceData.name}`);
        const aiProfile = await aiVoiceAnalyst.analyzeVoiceProfile(voiceData);
        aiProfiles.push(aiProfile);
        aiProcessed++;

        // Update progress
        progress.currentVideo = `AI Analyzing ${voiceData.name} (${aiProcessed}/${allVoiceData.length})`;

        // API rate limiting for Claude
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (aiError) {
        console.error(`[AI Batch Analysis] AI analysis error for ${voiceData.name}:`, aiError);
        progress.errors.push(`AI analysis error for ${voiceData.name}: ${String(aiError)}`);
      }
    }

    // Phase 3: Cross-Video AI Matching
    console.log(`[AI Batch Analysis] Finding cross-video matches with AI...`);
    progress.currentVideo = 'AI Cross-Video Matching...';

    const crossVideoMatches = await aiVoiceAnalyst.findCrossVideoMatches(aiProfiles);

    // Calculate insights
    const uniqueSpeakers = aiProfiles.length - crossVideoMatches.reduce((sum, match) => sum + match.speakerGroup.length - 1, 0);
    const expertiseAreas = [...new Set(aiProfiles.flatMap(p => p.personalityTraits.expertise))];
    
    const qualityDistribution = {
      excellent: aiProfiles.filter(p => p.aiRecommendations.cloningPriority >= 8).length,
      good: aiProfiles.filter(p => p.aiRecommendations.cloningPriority >= 6 && p.aiRecommendations.cloningPriority < 8).length,
      fair: aiProfiles.filter(p => p.aiRecommendations.cloningPriority < 6).length
    };

    progress.aiInsights = {
      uniqueSpeakers,
      crossVideoMatches: crossVideoMatches.length,
      expertiseAreas: expertiseAreas.slice(0, 10),
      qualityDistribution
    };

    // Final summary
    const summary = {
      totalVideos: videos.length,
      processed: progress.processed,
      errors: progress.errors.length,
      totalSpeakers: allVoiceData.length,
      aiAnalyzedSpeakers: aiProfiles.length,
      uniqueVoices: uniqueSpeakers,
      crossVideoMatches: crossVideoMatches.length,
      topExpertise: expertiseAreas.slice(0, 5),
      aiProvider: aiVoiceAnalyst.getStatus().provider
    };

    console.log(`[AI Batch Analysis] Complete! ${summary.aiAnalyzedSpeakers} speakers analyzed by AI`);
    console.log(`[AI Batch Analysis] Found ${summary.crossVideoMatches} cross-video voice matches`);
    console.log(`[AI Batch Analysis] Top expertise areas: ${summary.topExpertise.join(', ')}`);

    return NextResponse.json({
      success: true,
      progress,
      results,
      aiProfiles,
      crossVideoMatches,
      summary,
      aiInsights: {
        message: `AI analyzed ${aiProfiles.length} speakers using ${aiVoiceAnalyst.getStatus().provider}`,
        uniqueSpeakers,
        crossVideoMatches: crossVideoMatches.length,
        expertiseDistribution: expertiseAreas,
        qualityBreakdown: qualityDistribution,
        topRecommendations: aiProfiles
          .sort((a, b) => b.aiRecommendations.cloningPriority - a.aiRecommendations.cloningPriority)
          .slice(0, 5)
          .map(p => ({
            name: p.aiGeneratedName,
            useCase: p.aiRecommendations.bestUseCase,
            priority: p.aiRecommendations.cloningPriority,
            expertise: p.personalityTraits.expertise
          }))
      }
    });

  } catch (error) {
    console.error('[AI Batch Analysis] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'AI batch analysis failed',
      aiStatus: aiVoiceAnalyst.getStatus()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return AI service status and capabilities
    const status = aiVoiceAnalyst.getStatus();
    
    return NextResponse.json({
      success: true,
      aiStatus: status,
      capabilities: [
        'Claude Sonnet 4 Voice Analysis',
        'Cross-Video Speaker Matching',
        'Personality & Communication Style Detection',
        'Expertise Area Identification',
        'Quality Assessment & Recommendations',
        'Intelligent Voice Consolidation'
      ],
      recommendations: [
        'Process 10-20 videos for optimal results',
        'Ensure videos have clear audio',
        'Mix of different speakers provides better insights',
        'Business/training content works best for expertise detection'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}

// Helper functions
function determineVideoType(videoName: string): string {
  const name = videoName.toLowerCase();
  if (name.includes('training') || name.includes('course')) return 'training';
  if (name.includes('how to') || name.includes('tutorial')) return 'tutorial';
  if (name.includes('intro') || name.includes('introduction')) return 'introduction';
  if (name.includes('demo') || name.includes('demonstration')) return 'demonstration';
  return 'presentation';
}

function extractTopics(videoName: string): string[] {
  const topics = [];
  const name = videoName.toLowerCase();
  
  if (name.includes('roof')) topics.push('Roofing');
  if (name.includes('inspect')) topics.push('Inspection');
  if (name.includes('lead') || name.includes('crm')) topics.push('Sales', 'CRM');
  if (name.includes('storm')) topics.push('Insurance', 'Storm Assessment');
  if (name.includes('train') || name.includes('course')) topics.push('Training', 'Education');
  if (name.includes('tool')) topics.push('Tools', 'Equipment');
  
  return topics.length > 0 ? topics : ['General'];
} 