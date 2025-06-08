import { NextResponse } from 'next/server';
import { elevenLabsService } from '@/lib/services/elevenlabs.service';

export async function GET() {
  try {
    console.log('[Voice Test] Testing voice generation...');
    
    // Get available voices
    const voices = await elevenLabsService.getVoices();
    
    if (voices.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No voices available for testing'
      });
    }

    // Use the first available voice
    const testVoice = voices[0];
    const testText = "Hello! This is a test of the voice generation system for the Voice Personas platform.";
    
    console.log(`[Voice Test] Generating sample with voice: ${testVoice.name}`);
    
    // Generate a short sample
    const generatedAudio = await elevenLabsService.generateSample(
      testVoice.voice_id,
      testText,
      {
        stability: 0.75,
        similarity_boost: 0.75,
        style: 0.3
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Voice generation successful!',
      details: {
        voiceName: testVoice.name,
        voiceCategory: testVoice.category,
        textLength: testText.length,
        audioDuration: generatedAudio.duration,
        audioFormat: generatedAudio.format,
        hasAudioData: !!generatedAudio.audioBlob
      },
      testText,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Voice Test] Generation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 