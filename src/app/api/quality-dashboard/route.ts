import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { voicePersonas } from '@/lib/db/schema';
import { voiceQualityAnalyzer } from '@/lib/services/voice-quality-analyzer.service';
import { qualityCacheService } from '@/lib/cache/quality-cache.service';

interface QualityMetric {
  id: string;
  voiceName: string;
  overall: number;
  transcriptionAccuracy: number;
  audioClarity: number;
  naturalness: number;
  isProductionReady: boolean;
  lastTested: string;
  recommendations: string[];
}

// Check if voice ID is fake/phantom from old fallback system
function isFakeVoiceId(voiceId: string): boolean {
  // Detect fake voice IDs created by fallback system
  const fakePatterns = [
    /^voice_\d+_[a-z0-9]+$/,  // voice_1749348100001_dxafl0gdi pattern
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i  // UUID pattern (persona IDs)
  ];
  
  return fakePatterns.some(pattern => pattern.test(voiceId));
}

// Generate test speech and analyze quality for a voice
async function analyzeVoiceQualityDirect(voiceId: string, voiceName: string): Promise<QualityMetric> {
  try {
    console.log(`[Quality Dashboard API] Analyzing voice: ${voiceName} (${voiceId})`);

    // Check if this is a fake voice ID from old fallback system
    if (isFakeVoiceId(voiceId)) {
      console.warn(`[Quality Dashboard API] Detected fake voice ID for ${voiceName}: ${voiceId}`);
      return createFailedQualityMetric(voiceId, voiceName, 'Voice not properly cloned - fake voice ID detected');
    }

    // Generate test speech with analysis
    const testResponse = await fetch('http://localhost:3000/api/generate-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: "This is a comprehensive quality test for voice analysis and system monitoring.",
        voiceId: voiceId,
        analyzeQuality: true,
        settings: {
          stability: 0.85,
          similarity_boost: 0.95,
          style: 0.7,
          use_speaker_boost: true
        }
      })
    });

    if (!testResponse.ok) {
      console.error(`[Quality Dashboard API] Speech generation failed for ${voiceName}: ${testResponse.status}`);
      
      // Parse error details for better reporting
      let errorMessage = `API Error: ${testResponse.status}`;
      try {
        const errorText = await testResponse.text();
        if (errorText.includes('voice_not_found')) {
          errorMessage = 'Voice not found in ElevenLabs - may be fake/expired';
        } else if (errorText.includes('quota_exceeded')) {
          errorMessage = 'ElevenLabs quota exceeded';
        } else if (errorText.includes('unauthorized')) {
          errorMessage = 'Invalid ElevenLabs API key';
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
      
      return createFailedQualityMetric(voiceId, voiceName, errorMessage);
    }

    // Extract quality metrics from response headers
    const overall = parseFloat(testResponse.headers.get('X-Voice-Quality-Overall') || '0');
    const transcriptionAccuracy = parseFloat(testResponse.headers.get('X-Voice-Quality-Transcription') || '0');
    const audioClarity = parseFloat(testResponse.headers.get('X-Voice-Quality-Clarity') || '0');
    const naturalness = parseFloat(testResponse.headers.get('X-Voice-Quality-Naturalness') || '0');
    const isProductionReady = testResponse.headers.get('X-Voice-Quality-Production-Ready') === 'true';
    
    // Decode recommendations
    let recommendations: string[] = [];
    try {
      const encodedRecs = testResponse.headers.get('X-Voice-Quality-Recommendations');
      if (encodedRecs) {
        const decodedRecs = Buffer.from(encodedRecs, 'base64').toString('utf-8');
        recommendations = JSON.parse(decodedRecs);
      }
    } catch (error) {
      recommendations = ['📊 Quality analysis completed'];
    }

    console.log(`[Quality Dashboard API] ✅ Quality analysis complete for ${voiceName}: ${Math.round(overall * 100)}%`);

    return {
      id: voiceId,
      voiceName,
      overall,
      transcriptionAccuracy,
      audioClarity,
      naturalness,
      isProductionReady,
      lastTested: new Date().toISOString(),
      recommendations
    };

  } catch (error) {
    console.error(`[Quality Dashboard API] Error analyzing ${voiceName}:`, error);
    return createFailedQualityMetric(voiceId, voiceName, error instanceof Error ? error.message : 'Unknown error');
  }
}

function createFailedQualityMetric(voiceId: string, voiceName: string, errorMessage: string): QualityMetric {
  return {
    id: voiceId,
    voiceName,
    overall: 0,
    transcriptionAccuracy: 0,
    audioClarity: 0,
    naturalness: 0,
    isProductionReady: false,
    lastTested: new Date().toISOString(),
    recommendations: [
      '❌ Quality analysis failed',
      `Error: ${errorMessage}`,
      '🔧 Check voice configuration and try again'
    ]
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('[Quality Dashboard API] Loading quality dashboard data...');

    // Check query parameters for cache control
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    const cacheStatus = await qualityCacheService.getCacheStatus();

    // Try to use cached data first (unless force refresh requested)
    if (!forceRefresh) {
      const cachedData = await qualityCacheService.getCachedData();
      if (cachedData) {
        console.log('[Quality Dashboard API] ✅ Returning cached quality data');
        
        return NextResponse.json({
          success: true,
          data: {
            overview: cachedData.overview,
            metrics: cachedData.metrics
          },
          cache: {
            hit: true,
            timestamp: cachedData.timestamp,
            expiresAt: cachedData.expiresAt,
            learningIteration: cachedData.learningIteration,
            cacheAge: cacheStatus.cacheAge
          },
          learning: qualityCacheService.getLearningIntegrationStatus()
        });
      }
    }

    console.log('[Quality Dashboard API] Cache miss or force refresh - running fresh analysis...');

    // Load all voice personas from database
    const personas = await db.select().from(voicePersonas);
    console.log(`[Quality Dashboard API] Found ${personas.length} voice personas`);

    if (personas.length === 0) {
      const emptyOverview = {
        totalVoices: 0,
        averageQuality: 0,
        productionReady: 0,
        needsImprovement: 0,
        systemHealth: 'poor' as const,
        lastCalibration: new Date().toISOString().split('T')[0]
      };

      // Cache the empty result too
      await qualityCacheService.setCachedData(emptyOverview, []);

      return NextResponse.json({
        success: true,
        data: {
          overview: emptyOverview,
          metrics: []
        },
        cache: {
          hit: false,
          timestamp: new Date().toISOString(),
          fresh: true
        },
        learning: qualityCacheService.getLearningIntegrationStatus()
      });
    }

    // Analyze quality for each voice persona
    const qualityMetrics: QualityMetric[] = [];
    
    for (const persona of personas) {
      // Extract ElevenLabs voice ID from persona settings
      let voiceId = persona.id;
      
      if (persona.voiceSettings) {
        try {
          const settings = typeof persona.voiceSettings === 'string' 
            ? JSON.parse(persona.voiceSettings) 
            : persona.voiceSettings;
          
          if (settings.voiceId) {
            voiceId = settings.voiceId;
          }
        } catch (error) {
          console.warn(`[Quality Dashboard API] Could not parse voice settings for ${persona.name}`);
        }
      }

      const qualityResult = await analyzeVoiceQualityDirect(voiceId, persona.name);
      qualityMetrics.push(qualityResult);
    }

    // Calculate overview statistics
    const productionReady = qualityMetrics.filter(m => m.isProductionReady).length;
    const averageQuality = qualityMetrics.reduce((sum, m) => sum + m.overall, 0) / qualityMetrics.length;
    
    // Determine system health based on metrics
    let systemHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (averageQuality >= 0.85 && productionReady >= qualityMetrics.length * 0.8) {
      systemHealth = 'excellent';
    } else if (averageQuality >= 0.75 && productionReady >= qualityMetrics.length * 0.6) {
      systemHealth = 'good';
    } else if (averageQuality >= 0.65 && productionReady >= qualityMetrics.length * 0.4) {
      systemHealth = 'fair';
    }

    const overview = {
      totalVoices: qualityMetrics.length,
      averageQuality,
      productionReady,
      needsImprovement: qualityMetrics.length - productionReady,
      systemHealth,
      lastCalibration: new Date().toISOString().split('T')[0]
    };

    // Cache the fresh results
    await qualityCacheService.setCachedData(overview, qualityMetrics);

    console.log('[Quality Dashboard API] ✅ Fresh quality analysis complete and cached:', overview);

    return NextResponse.json({
      success: true,
      data: {
        overview,
        metrics: qualityMetrics
      },
      cache: {
        hit: false,
        timestamp: new Date().toISOString(),
        fresh: true,
        learningIteration: qualityCacheService.getLearningIntegrationStatus().iterationCount
      },
      learning: qualityCacheService.getLearningIntegrationStatus()
    });

  } catch (error) {
    console.error('[Quality Dashboard API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load quality dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 