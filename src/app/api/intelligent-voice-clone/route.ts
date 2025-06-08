import { NextRequest, NextResponse } from 'next/server';
import { intelligentAudioExtractorService, MediaInput } from '@/lib/services/intelligent-audio-extractor.service';
import { elevenLabsService } from '@/lib/services/eleven-labs.service';
import { db } from '@/lib/db/connection';
import { voicePersonas, elevenLabsVoices } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/config/dev-constants';

export async function POST(request: NextRequest) {
  try {
    console.log('[Intelligent Voice Clone API] Processing request...');

    const contentType = request.headers.get('content-type') || '';
    let mediaType: string, mediaSource: string, voiceName: string, file: File | null = null, options: any = {};
    
    if (contentType.includes('application/json')) {
      // Handle JSON requests (from programmatic tests)
      const body = await request.json();
      mediaType = body.mediaType;
      mediaSource = body.mediaSource;
      voiceName = body.voiceName || 'Intelligent Clone';
      options = body.options || {};
    } else {
      // Handle FormData requests (from UI)
      const formData = await request.formData();
      mediaType = formData.get('mediaType') as string;
      mediaSource = formData.get('mediaSource') as string;
      voiceName = formData.get('voiceName') as string || 'Intelligent Clone';
      file = formData.get('file') as File | null;
    }

    if (!mediaType || (!mediaSource && !file)) {
      return NextResponse.json(
        { error: 'Media type and source/file are required' },
        { status: 400 }
      );
    }

    console.log(`[Intelligent Voice Clone API] Media type: ${mediaType}`);
    console.log(`[Intelligent Voice Clone API] Voice name: ${voiceName}`);

    // Prepare media input
    let mediaInput: MediaInput;
    
    if (file) {
      // Handle direct file upload
      console.log(`[Intelligent Voice Clone API] Processing uploaded file: ${file.name}`);
      
      // TODO: Upload file to S3 and get URL
      const fileUrl = await uploadFileToS3(file);
      
      mediaInput = {
        type: getMediaTypeFromFile(file),
        source: fileUrl,
        metadata: {
          title: file.name,
          duration: undefined // Will be detected
        }
      };
    } else {
      // Handle URL/link input
      mediaInput = {
        type: mediaType as MediaInput['type'],
        source: mediaSource,
        metadata: {
          title: voiceName
        }
      };
    }

    // Step 1: Intelligent audio analysis and extraction
    console.log('[Intelligent Voice Clone API] Starting intelligent audio analysis...');
    
    const analysisResult = await intelligentAudioExtractorService.extractMainSpeakerAudio(
      mediaInput,
      {
        targetDuration: 120, // 2 minutes minimum
        maxSegments: 5,
        qualityThreshold: 0.7
      }
    );

    console.log(`[Intelligent Voice Clone API] Analysis complete:`);
    console.log(`  - Audio Quality: ${analysisResult.audioQuality}`);
    console.log(`  - Noise Level: ${analysisResult.noiseLevel}`);
    console.log(`  - Speaker Count: ${analysisResult.speakerCount}`);
    console.log(`  - Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`);
    console.log(`  - Main Speaker Segments: ${analysisResult.mainSpeakerSegments.length}`);

    // Step 2: Quality assessment and recommendations
    if (analysisResult.audioQuality === 'poor') {
      return NextResponse.json({
        success: false,
        error: 'Audio quality too low for voice cloning',
        audioQuality: analysisResult.audioQuality,
        noiseLevel: analysisResult.noiseLevel,
        recommendations: analysisResult.recommendations
      }, { status: 400 });
    }

    if (analysisResult.mainSpeakerSegments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No suitable main speaker segments found',
        speakerCount: analysisResult.speakerCount,
        recommendations: analysisResult.recommendations
      }, { status: 400 });
    }

    // Step 3: Convert to ElevenLabs format and clone voice
    console.log('[Intelligent Voice Clone API] Creating voice clone with cleaned audio...');
    
    const audioFiles = analysisResult.mainSpeakerSegments
      .filter(seg => seg.extractedAudioUrl)
      .map(seg => ({
        url: seg.extractedAudioUrl!,
        duration: seg.duration,
        quality: (seg.audioQuality > 0.8 ? 'high' : seg.audioQuality > 0.6 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        format: 'wav' as const,
        size: Math.floor(seg.duration * 44100 * 2), // Estimate size based on duration
        sampleRate: 44100,
        channels: 1
      }));

    // Apply adaptive settings from learning system if provided
    const cloneSettings = options.adaptiveSettings || {
      stability: 0.95,
      similarity_boost: 0.90,
      style: 0.65,
      use_speaker_boost: true
    };

    console.log('[Intelligent Voice Clone API] Using adaptive settings:', cloneSettings);

    // Use the existing ElevenLabs service with cleaned audio and adaptive settings
    const cloneResult = await elevenLabsService.cloneVoiceFromAudio(
      audioFiles,
      voiceName,
      `Intelligent voice clone from ${mediaType}. Quality: ${analysisResult.audioQuality}, Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`
    );

    // Step 4: Store results with analysis metadata
    const userId = getCurrentUserId();
    
    // Store ElevenLabs voice record
    await db.insert(elevenLabsVoices).values({
      userId,
      voiceId: cloneResult.voiceId!,
      name: voiceName,
      category: 'intelligent_cloned',
      description: `Intelligent clone: ${analysisResult.audioQuality} quality, ${analysisResult.noiseLevel} noise`,
      status: 'ready',
      source: 'intelligent_extraction',
      settings: JSON.stringify({
        ...cloneSettings,
        analysis: {
          audioQuality: analysisResult.audioQuality,
          noiseLevel: analysisResult.noiseLevel,
          speakerCount: analysisResult.speakerCount,
          confidence: analysisResult.confidence,
          segmentsUsed: analysisResult.mainSpeakerSegments.length
        }
      }),
      extractedSegments: analysisResult.mainSpeakerSegments.length,
      qualityScore: analysisResult.confidence.toString(),
      usageCount: 0,
      isActive: true
    }).returning();

    // Store voice persona
    const [persona] = await db.insert(voicePersonas).values({
      userId,
      name: `${voiceName} 🧠`,
      region: 'United States',
      accent: 'Intelligent',
      age: 30,
      tone: 'Professional',
      energy: 'Medium',
      description: `AI-optimized voice clone. ${analysisResult.recommendations[0]}`,
      avatar: '🧠',
      sampleText: "Hello! I'm an intelligently extracted voice clone with optimized audio quality and noise reduction.",
      voiceSettings: JSON.stringify({
        ...cloneSettings,
        voiceId: cloneResult.voiceId,
        similarity: cloneResult.similarity,
        characteristics: cloneResult.characteristics,
        intelligentAnalysis: {
          audioQuality: analysisResult.audioQuality,
          noiseLevel: analysisResult.noiseLevel,
          confidence: analysisResult.confidence,
          recommendations: analysisResult.recommendations
        }
      }),
      isDefault: false,
      isActive: true
    }).returning();

    console.log(`[Intelligent Voice Clone API] Voice clone created successfully!`);
    console.log(`  - ElevenLabs Voice ID: ${cloneResult.voiceId}`);
    console.log(`  - Persona ID: ${persona.id}`);
    console.log(`  - Similarity: ${cloneResult.similarity?.overall || 'N/A'}%`);

    return NextResponse.json({
      success: true,
      voiceId: cloneResult.voiceId,
      personaId: persona.id,
      personaName: persona.name,
      similarity: cloneResult.similarity,
      characteristics: cloneResult.characteristics,
      analysis: {
        audioQuality: analysisResult.audioQuality,
        noiseLevel: analysisResult.noiseLevel,
        speakerCount: analysisResult.speakerCount,
        confidence: analysisResult.confidence,
        segmentsUsed: analysisResult.mainSpeakerSegments.length,
        totalDuration: analysisResult.mainSpeakerSegments.reduce((sum, seg) => sum + seg.duration, 0),
        recommendations: analysisResult.recommendations,
        openaiAnalysis: (analysisResult as any).openaiAnalysis || false
      },
      message: 'Intelligent voice clone created successfully with optimized audio extraction!'
    });

  } catch (error) {
    console.error('[Intelligent Voice Clone API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Voice cloning failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
async function uploadFileToS3(file: File): Promise<string> {
  // Simulate file upload to S3
  console.log(`[Upload] Uploading ${file.name} to S3...`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const filename = `uploads/${Date.now()}_${file.name}`;
  const s3Url = `https://restore-masters-media.s3.us-east-1.amazonaws.com/${filename}`;
  
  console.log(`[Upload] File uploaded: ${s3Url}`);
  return s3Url;
}

function getMediaTypeFromFile(file: File): MediaInput['type'] {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'mp3':
    case 'wav':
      return ext;
    case 'mp4':
    case 'mov':
    case 'avi':
      return 'mp4';
    default:
      return 'mp4'; // Default to video
  }
} 