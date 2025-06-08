import { NextRequest, NextResponse } from 'next/server';
import { voiceCloningService } from '@/lib/services/voice-cloning.service';
import { audioExtractionService } from '@/lib/services/audio-extraction.service';

import { db } from '@/lib/db/connection';
import { detectedSpeakers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('[Extract and Clone API] Starting extract and clone process');
    
    const { speakerId, videoUri } = await request.json();
    
    if (!speakerId) {
      return NextResponse.json({
        success: false,
        error: 'Speaker ID is required'
      }, { status: 400 });
    }

    // Get speaker details with audio segments
    const speaker = await db.query.detectedSpeakers?.findFirst?.({
      where: eq(detectedSpeakers.speakerId, speakerId),
      with: { audioSegments: true }
    });

    if (!speaker) {
      return NextResponse.json({
        success: false,
        error: 'Speaker not found'
      }, { status: 404 });
    }

    if (!speaker.audioSegments || speaker.audioSegments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No audio segments found for this speaker'
      }, { status: 400 });
    }

    console.log(`[Extract and Clone API] Processing speaker: ${speaker.name} with ${speaker.audioSegments.length} segments`);

    // Step 1: Extract audio segments
    console.log('[Extract and Clone API] Step 1: Extracting audio segments...');
    
    const extractionOptions = {
      speakerId: speaker.speakerId,
      videoUrl: videoUri || `https://vimeo.com/video`, // Use provided URI or fallback
      segments: speaker.audioSegments.slice(0, 3).map(seg => ({
        id: seg.id,
        startTime: parseFloat(seg.startTime || '0'),
        endTime: parseFloat(seg.endTime || '0'),
        text: seg.text || ''
      })),
      speakerName: speaker.name || 'Unknown Speaker'
    };

    const extractedFiles = await audioExtractionService.extractAudioSegments(extractionOptions);
    
    if (extractedFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to extract audio segments'
      }, { status: 500 });
    }

    console.log(`[Extract and Clone API] Step 1 Complete: Extracted ${extractedFiles.length} audio files`);

    // Step 2: Clone voice using extracted audio
    console.log('[Extract and Clone API] Step 2: Cloning voice...');
    
    const audioUrls = extractedFiles.map(file => file.url);
    
    const cloneResult = await voiceCloningService.cloneVoiceAndCreatePersona({
      speakerId: speaker.speakerId,
      audioUrls,
      personaName: speaker.name || 'Unknown Speaker',
      description: `AI-cloned voice from extracted audio segments: ${speaker.name || 'Unknown Speaker'}`
    });

    if (!cloneResult.success) {
      return NextResponse.json({
        success: false,
        error: `Voice cloning failed: ${cloneResult.error}`
      }, { status: 500 });
    }

    console.log(`[Extract and Clone API] Step 2 Complete: Voice cloned successfully`);
    console.log(`[Extract and Clone API] Created persona: ${cloneResult.personaId} with voice: ${cloneResult.voiceId}`);

    // Step 3: Return comprehensive results
    return NextResponse.json({
      success: true,
      message: 'Audio extraction and voice cloning completed successfully',
      results: {
        extraction: {
          filesExtracted: extractedFiles.length,
          totalDuration: extractedFiles.reduce((sum, file) => sum + file.duration, 0),
          audioFiles: extractedFiles.map(file => ({
            url: file.url,
            duration: file.duration,
            quality: file.quality,
            format: file.format
          }))
        },
        voiceCloning: {
          success: cloneResult.success,
          voiceId: cloneResult.voiceId,
          personaId: cloneResult.personaId,
          usage: cloneResult.usage
        },
        speaker: {
          id: speaker.speakerId,
          name: speaker.name,
          accent: speaker.accent,
          qualityScore: speaker.qualityScore
        }
      }
    });

  } catch (error) {
    console.error('[Extract and Clone API] Error in extract and clone process:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to complete extract and clone process',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 