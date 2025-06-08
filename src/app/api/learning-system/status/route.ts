import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    console.log('[Learning System API] Loading learning system status...');
    
    const learningDataPath = path.join(process.cwd(), 'enhanced_learning_data.json');
    
    // Check if learning data file exists
    if (!fs.existsSync(learningDataPath)) {
      console.log('[Learning System API] Enhanced learning data file not found');
      return NextResponse.json({
        success: false,
        error: 'Learning data file not found',
        message: 'Run some voice generation or cloning operations to initialize the learning system'
      });
    }

    // Load learning data
    const learningDataRaw = fs.readFileSync(learningDataPath, 'utf8');
    const learningData = JSON.parse(learningDataRaw);

    // Add computed metrics
    const computedData = {
      ...learningData,
      // Ensure required fields exist
      totalClones: learningData.totalClones || 0,
      totalVoiceClones: learningData.totalVoiceClones || 0,
      averageQuality: learningData.averageQuality || 0,
      averageCloneQuality: learningData.averageCloneQuality || 0,
      learningIterations: learningData.learningIterations || 0,
      voiceAnalytics: learningData.voiceAnalytics || {},
      cloningAnalytics: learningData.cloningAnalytics || {},
      qualityTrends: learningData.qualityTrends || [],
      bestSettings: learningData.bestSettings || {
        stability: 0.85,
        similarity_boost: 0.95,
        style: 0.7,
        use_speaker_boost: true
      },
      systemPerformance: learningData.systemPerformance || null,
      
      // Add metadata
      lastLoaded: new Date().toISOString(),
      fileSize: learningDataRaw.length,
      hasPerformanceData: !!learningData.systemPerformance,
      trendsCount: (learningData.qualityTrends || []).length,
      voiceAnalyticsCount: Object.keys(learningData.voiceAnalytics || {}).length,
      cloningAnalyticsCount: Object.keys(learningData.cloningAnalytics || {}).length
    };

    console.log(`[Learning System API] ✅ Learning data loaded: ${computedData.learningIterations} iterations, ${computedData.trendsCount} trends`);

    return NextResponse.json({
      success: true,
      learningData: computedData,
      metadata: {
        lastUpdated: learningData.systemPerformance?.lastQualitySync || 'Unknown',
        iterations: computedData.learningIterations,
        dataPoints: computedData.trendsCount,
        voicesTracked: computedData.voiceAnalyticsCount,
        clonesTracked: computedData.cloningAnalyticsCount,
        hasPerformanceMetrics: computedData.hasPerformanceData
      }
    });

  } catch (error) {
    console.error('[Learning System API] Error loading learning data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to load learning system data',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Check if learning system files are accessible and properly formatted'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Learning System API] Updating learning system data...');
    
    const body = await request.json();
    const learningDataPath = path.join(process.cwd(), 'enhanced_learning_data.json');
    
    // Load existing data or create new
    let existingData = {};
    if (fs.existsSync(learningDataPath)) {
      const existingRaw = fs.readFileSync(learningDataPath, 'utf8');
      existingData = JSON.parse(existingRaw);
    }

    // Merge with new data
    const updatedData = {
      ...existingData,
      ...body,
      lastUpdated: new Date().toISOString(),
      learningIterations: (existingData as any).learningIterations ? (existingData as any).learningIterations + 1 : 1
    };

    // Save updated data
    fs.writeFileSync(learningDataPath, JSON.stringify(updatedData, null, 2));
    
    console.log('[Learning System API] ✅ Learning data updated');

    return NextResponse.json({
      success: true,
      message: 'Learning system data updated successfully',
      iteration: updatedData.learningIterations
    });

  } catch (error) {
    console.error('[Learning System API] Error updating learning data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update learning system data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 