import { NextRequest, NextResponse } from 'next/server';
import { configManager } from '@/config/app';

export async function GET(request: NextRequest) {
  try {
    const elevenLabsConfig = configManager.getApiConfig('elevenLabs');
    const hasApiKey = !!(elevenLabsConfig as any).apiKey;
    const apiKeyPreview = hasApiKey ? `${(elevenLabsConfig as any).apiKey.substring(0, 8)}...` : 'Not found';
    
    return NextResponse.json({
      success: true,
      elevenLabsDetected: hasApiKey,
      apiKeyPreview,
      baseUrl: elevenLabsConfig.baseUrl,
      environment: process.env.NODE_ENV,
      envVars: {
        ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
        ELEVENLABS_API_KEY_preview: process.env.ELEVENLABS_API_KEY ? `${process.env.ELEVENLABS_API_KEY.substring(0, 8)}...` : 'Not found'
      }
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