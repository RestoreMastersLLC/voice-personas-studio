import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/config/app';

export async function GET(request: NextRequest) {
  try {
    const elevenLabsConfig = configManager.getApiConfig('elevenLabs');
    const apiKey = (elevenLabsConfig as any).apiKey;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No ElevenLabs API key found'
      }, { status: 400 });
    }

    // Check user subscription info
    const userResponse = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `User API Error: ${userResponse.status}`,
        details: await userResponse.text()
      }, { status: userResponse.status });
    }

    const userData = await userResponse.json();

    // Check available voices
    const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    let voicesData = null;
    if (voicesResponse.ok) {
      voicesData = await voicesResponse.json();
    }

    return NextResponse.json({
      success: true,
      apiKeyPreview: `${apiKey.substring(0, 8)}...`,
      user: userData,
      voicesCount: voicesData?.voices?.length || 0,
      subscription: userData.subscription || 'Unknown',
      canClone: userData.can_use_instant_voice_cloning || false
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 