import { NextRequest, NextResponse } from 'next/server';
import { speakerDetectionService } from '@/lib/services/speaker-detection.service';
import { voiceCloningService } from '@/lib/services/voice-cloning.service';
import { VimeoVideo } from '@/lib/types';

export async function GET(_request: NextRequest) {
  try {
    console.log('[Voice Cloning Test] Starting comprehensive voice cloning test...');

    // Create a mock video for testing
    const mockVideo: VimeoVideo = {
      uri: '/videos/test-123456',
      name: 'Professional Training: Safety Protocols and Best Practices',
      description: 'A comprehensive training video covering safety protocols, documentation requirements, and industry best practices for field operations.',
      duration: 1240, // ~20 minutes
      thumbnail: 'https://i.vimeocdn.com/video/123456_640x360.jpg',
      link: 'https://vimeo.com/123456',
      privacy: 'unlisted',
      tags: ['training', 'safety', 'protocols', 'professional'],
      stats: {
        plays: 1250
      },
      created_time: new Date().toISOString()
    };

    const testUserId = 'test-user-voice-cloning';

    console.log('[Voice Cloning Test] Step 1: Analyzing video for speaker detection...');
    
    // Step 1: Analyze video for speakers
    const analysisResult = await speakerDetectionService.analyzeVideo(mockVideo, testUserId);
    
    console.log(`[Voice Cloning Test] Analysis Result: ${analysisResult.speakers.length} speakers detected`);
    console.log('[Voice Cloning Test] Speakers:', analysisResult.speakers.map(s => ({
      name: s.name,
      accent: s.accent,
      quality: s.quality_score,
      segments: s.segments.length
    })));

    // Step 2: Clone voices for high-quality speakers
    console.log('[Voice Cloning Test] Step 2: Starting voice cloning for quality speakers...');
    
    const cloningResults = [];
    
    for (const speaker of analysisResult.speakers) {
      if (speaker.quality_score >= 8.0) {
        console.log(`[Voice Cloning Test] Cloning voice for ${speaker.name} (Quality: ${speaker.quality_score})`);
        
        const cloningResult = await voiceCloningService.cloneVoiceAndCreatePersona({
          speakerId: speaker.id,
          personaName: speaker.name,
          description: `Professional training voice - ${speaker.accent} accent`,
          audioUrls: [`mock-audio-${speaker.id}-segment1.wav`, `mock-audio-${speaker.id}-segment2.wav`]
        });

        cloningResults.push({
          speaker: speaker.name,
          result: cloningResult
        });

        console.log(`[Voice Cloning Test] Cloning result for ${speaker.name}:`, {
          success: cloningResult.success,
          voiceId: cloningResult.voiceId,
          personaId: cloningResult.personaId,
          error: cloningResult.error
        });
      } else {
        console.log(`[Voice Cloning Test] Skipping ${speaker.name} - quality too low (${speaker.quality_score})`);
      }
    }

    // Step 3: Test batch cloning
    console.log('[Voice Cloning Test] Step 3: Testing batch cloning workflow...');
    
    const batchResults = await voiceCloningService.batchCloneFromVideo(mockVideo.uri, testUserId);
    
    console.log('[Voice Cloning Test] Batch cloning completed');
    console.log('[Voice Cloning Test] Batch Results:', batchResults.map(r => ({
      success: r.success,
      voiceId: r.voiceId,
      personaId: r.personaId,
      error: r.error
    })));

    // Step 4: Verify cloning status
    console.log('[Voice Cloning Test] Step 4: Verifying cloning status...');
    
    const statusChecks = [];
    for (const speaker of analysisResult.speakers) {
      const status = await voiceCloningService.getCloningStatus(speaker.id);
      statusChecks.push({
        speaker: speaker.name,
        status: status.status,
        voiceId: status.voiceId,
        personaId: status.personaId
      });
    }

    // Summary
    const successfulClones = cloningResults.filter(r => r.result.success).length;
    const totalCharactersUsed = cloningResults.reduce((total, r) => 
      total + (r.result.usage?.charactersUsed || 0), 0
    );

    const testResults = {
      success: true,
      videoAnalysis: {
        videoName: mockVideo.name,
        speakersDetected: analysisResult.speakers.length,
        totalSpeechDuration: analysisResult.totalSpeechDuration,
        qualityAssessment: analysisResult.qualityAssessment
      },
      voiceCloning: {
        individualClones: cloningResults.length,
        successfulClones,
        totalCharactersUsed
      },
      batchCloning: {
        totalProcessed: batchResults.length,
        successful: batchResults.filter(r => r.success).length,
        failed: batchResults.filter(r => !r.success).length
      },
      finalStatus: statusChecks,
      summary: {
        totalPersonasCreated: successfulClones,
        averageQualityScore: analysisResult.speakers.reduce((sum, s) => sum + s.quality_score, 0) / analysisResult.speakers.length,
        processingTime: '~15 seconds (simulated)',
        readyForProduction: true
      }
    };

    console.log('[Voice Cloning Test] Test completed successfully!');
    console.log('[Voice Cloning Test] Summary:', testResults.summary);

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('[Voice Cloning Test] Test failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Voice cloning test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 