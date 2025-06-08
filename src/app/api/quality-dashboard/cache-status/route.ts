import { NextRequest, NextResponse } from 'next/server';
import { qualityCacheService } from '@/lib/cache/quality-cache.service';

export async function GET(request: NextRequest) {
  try {
    const cacheStatus = await qualityCacheService.getCacheStatus();
    const learningStatus = qualityCacheService.getLearningIntegrationStatus();

    return NextResponse.json({
      success: true,
      cache: cacheStatus,
      learning: learningStatus,
      thresholds: {
        cacheMaxAge: '30 minutes',
        forceRefreshThreshold: '4 hours',
        learningUpdateThreshold: '5 iterations'
      }
    });

  } catch (error) {
    console.error('[Cache Status API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get cache status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await qualityCacheService.invalidateCache();

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully'
    });

  } catch (error) {
    console.error('[Cache Status API] Error invalidating cache:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 