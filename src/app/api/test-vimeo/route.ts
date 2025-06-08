import { NextResponse } from 'next/server';
import { vimeoService } from '@/lib/services/vimeo.service';

export async function GET() {
  try {
    console.log('[Vimeo Test] Testing Vimeo API integration...');
    
    // Test 1: Connection validation
    const isConnected = await vimeoService.validateConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Vimeo API connection failed',
        message: 'Could not authenticate with Vimeo API'
      }, { status: 500 });
    }

    // Test 2: Fetch user's videos
    const videos = await vimeoService.getVideos(1, 5); // Get first 5 videos
    
    // Test 3: Check if we're getting real data or mock data
    const usingRealData = videos.data.length > 0 && videos.data[0].uri.includes('/videos/');
    
    return NextResponse.json({
      success: true,
      message: 'Vimeo API integration test completed',
      results: {
        connectionValid: isConnected,
        videosFound: videos.total,
        videosSample: videos.data.slice(0, 3).map(v => ({
          uri: v.uri,
          name: v.name,
          duration: v.duration,
          privacy: v.privacy,
          created: v.created_time
        })),
        usingRealData,
        pagination: {
          page: videos.page,
          per_page: videos.per_page,
          total: videos.total
        }
      },
      recommendations: [
        ...(usingRealData ? 
          ['✅ Successfully connected to your Vimeo library'] : 
          ['⚠️ Using mock data - check your access token']),
        ...(videos.total > 0 ? 
          [`Found ${videos.total} videos in your library`] : 
          ['No videos found in your Vimeo account'])
      ]
    });

  } catch (error) {
    console.error('[Vimeo Test] Error testing Vimeo API:', error);
    
    return NextResponse.json({
      success: false,
      error: String(error),
      message: 'Vimeo API test failed',
      troubleshooting: [
        'Check if your Vimeo access token is valid',
        'Verify token has required permissions (public, private, video_files)',
        'Ensure your Vimeo account has videos uploaded',
        'Check if token is properly added to .env.local file'
      ]
    }, { status: 500 });
  }
} 