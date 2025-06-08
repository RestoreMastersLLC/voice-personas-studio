import { NextRequest, NextResponse } from 'next/server';
import { vimeoService } from '@/lib/services/vimeo.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '12');
    const query = searchParams.get('query') || '';

    console.log(`[Vimeo Videos API] Fetching videos - page: ${page}, per_page: ${perPage}, query: "${query}"`);

    // Fetch videos from Vimeo service
    const result = await vimeoService.getVideos(page, perPage, query);

    console.log(`[Vimeo Videos API] Found ${result.total} total videos, returning ${result.data.length} videos`);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Found ${result.total} videos in your Vimeo library`
    });

  } catch (error) {
    console.error('[Vimeo Videos API] Error fetching videos:', error);
    
    return NextResponse.json({
      success: false,
      error: String(error),
      message: 'Failed to fetch videos from Vimeo',
      data: [],
      total: 0,
      page: 1,
      per_page: 12
    }, { status: 500 });
  }
} 