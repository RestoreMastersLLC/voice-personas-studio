import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/connection';
import { s3Service } from '@/lib/services/aws-s3';
import { elevenLabsService } from '@/lib/services/elevenlabs.service';

interface TestResult {
  service: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: Record<string, unknown>;
  responseTime?: number;
}

export async function GET() {
  const results: TestResult[] = [];
  
  console.log('[API Test] Starting comprehensive API connection tests...');

  // Test 1: Database Connection
  console.log('[API Test] Testing database connection...');
  const dbStart = Date.now();
  try {
    const isHealthy = await dbService.healthCheck();
    const dbInfo = dbService.getConnectionInfo();
    
    if (isHealthy) {
      results.push({
        service: 'PostgreSQL Database',
        status: 'success',
        message: 'Database connection successful',
        details: dbInfo,
        responseTime: Date.now() - dbStart
      });
    } else {
      results.push({
        service: 'PostgreSQL Database',
        status: 'error',
        message: 'Database health check failed',
        details: dbInfo,
        responseTime: Date.now() - dbStart
      });
    }
  } catch (error) {
    results.push({
      service: 'PostgreSQL Database',
      status: 'error',
      message: `Database connection failed: ${error}`,
      responseTime: Date.now() - dbStart
    });
  }

  // Test 2: ElevenLabs API
  console.log('[API Test] Testing ElevenLabs API...');
  const elevenStart = Date.now();
  try {
    const isValid = await elevenLabsService.validateConnection();
    
    if (isValid) {
      const userInfo = await elevenLabsService.getUserInfo();
      results.push({
        service: 'ElevenLabs API',
        status: 'success',
        message: 'ElevenLabs connection successful',
        details: {
          subscription: userInfo.subscription,
          charactersUsed: userInfo.character_count,
          charactersLimit: userInfo.character_limit,
          canCloneVoices: userInfo.can_clone_voices,
          voiceCount: userInfo.voice_count,
          voiceLimit: userInfo.voice_limit
        },
        responseTime: Date.now() - elevenStart
      });
    } else {
      results.push({
        service: 'ElevenLabs API',
        status: 'error',
        message: 'ElevenLabs connection validation failed',
        responseTime: Date.now() - elevenStart
      });
    }
  } catch (error) {
    results.push({
      service: 'ElevenLabs API',
      status: 'error',
      message: `ElevenLabs API error: ${error}`,
      responseTime: Date.now() - elevenStart
    });
  }

  // Test 3: ElevenLabs Voices
  console.log('[API Test] Testing ElevenLabs voice listing...');
  const voicesStart = Date.now();
  try {
    const voices = await elevenLabsService.getVoices();
    results.push({
      service: 'ElevenLabs Voices',
      status: 'success',
      message: `Found ${voices.length} available voices`,
      details: {
        voiceCount: voices.length,
        premadeVoices: voices.filter(v => v.category === 'premade').length,
        clonedVoices: voices.filter(v => v.category === 'cloned').length,
        sampleVoices: voices.slice(0, 3).map(v => ({ name: v.name, category: v.category }))
      },
      responseTime: Date.now() - voicesStart
    });
  } catch (error) {
    results.push({
      service: 'ElevenLabs Voices',
      status: 'error',
      message: `Voice listing failed: ${error}`,
      responseTime: Date.now() - voicesStart
    });
  }

  // Test 4: AWS S3 Configuration
  console.log('[API Test] Testing AWS S3 configuration...');
  const s3Start = Date.now();
  try {
    const s3Info = s3Service.getServiceInfo();
    
    // Test a simple operation (check if we can initialize)
    if (s3Info.bucket && s3Info.region) {
      results.push({
        service: 'AWS S3',
        status: 'success',
        message: 'AWS S3 configuration valid',
        details: {
          bucket: s3Info.bucket,
          region: s3Info.region,
          environment: s3Info.environment
        },
        responseTime: Date.now() - s3Start
      });
    } else {
      results.push({
        service: 'AWS S3',
        status: 'error',
        message: 'AWS S3 configuration incomplete',
        details: s3Info,
        responseTime: Date.now() - s3Start
      });
    }
  } catch (error) {
    results.push({
      service: 'AWS S3',
      status: 'error',
      message: `AWS S3 configuration error: ${error}`,
      responseTime: Date.now() - s3Start
    });
  }

  // Test 5: Environment Variables
  console.log('[API Test] Testing environment variables...');
  const envStart = Date.now();
  const envTests = {
    'ELEVENLABS_API_KEY': !!process.env.ELEVENLABS_API_KEY,
    'DATABASE_URL': !!process.env.DATABASE_URL,
    'AWS_REGION': !!process.env.AWS_REGION,
    'AWS_ACCESS_KEY_ID': !!process.env.AWS_ACCESS_KEY_ID,
    'AWS_SECRET_ACCESS_KEY': !!process.env.AWS_SECRET_ACCESS_KEY,
    'AWS_S3_BUCKET': !!process.env.AWS_S3_BUCKET,
    'CLAUDE_API_KEY': !!process.env.CLAUDE_API_KEY,
    'VIMEO_ACCESS_TOKEN': !!process.env.VIMEO_ACCESS_TOKEN,
  };

  const missingEnvVars = Object.entries(envTests)
    .filter(([_, exists]) => !exists)
    .map(([key, _]) => key);

  results.push({
    service: 'Environment Variables',
    status: missingEnvVars.length === 0 ? 'success' : 'warning',
    message: missingEnvVars.length === 0 
      ? 'All environment variables configured'
      : `Missing: ${missingEnvVars.join(', ')}`,
    details: {
      configured: Object.entries(envTests).filter(([_, exists]) => exists).map(([key, _]) => key),
      missing: missingEnvVars,
      total: Object.keys(envTests).length
    },
    responseTime: Date.now() - envStart
  });

  // Test 6: Voice Personas Database Query
  console.log('[API Test] Testing Voice Personas database query...');
  const personasStart = Date.now();
  try {
    const { db } = await import('@/lib/db/connection');
    const personas = await db.query.voicePersonas?.findMany?.() || [];
    
    results.push({
      service: 'Voice Personas DB',
      status: 'success',
      message: `Found ${personas.length} voice personas in database`,
      details: {
        personaCount: personas.length,
        samplePersonas: personas.slice(0, 3).map((p: any) => ({ 
          name: p.name, 
          region: p.region, 
          accent: p.accent 
        }))
      },
      responseTime: Date.now() - personasStart
    });
  } catch (error) {
    results.push({
      service: 'Voice Personas DB',
      status: 'error',
      message: `Voice Personas query failed: ${error}`,
      responseTime: Date.now() - personasStart
    });
  }

  // Test 7: Vimeo API Status
  console.log('[API Test] Checking Vimeo API status...');
  const vimeoStart = Date.now();
  try {
    const { vimeoService } = await import('@/lib/services/vimeo.service');
    const isValid = await vimeoService.validateConnection();
    
    if (isValid) {
      results.push({
        service: 'Vimeo API',
        status: 'success',
        message: 'Vimeo API connection successful',
        responseTime: Date.now() - vimeoStart
      });
    } else {
      results.push({
        service: 'Vimeo API',
        status: 'warning',
        message: 'Vimeo API not configured (using mock data in development)',
        details: {
          note: 'Vimeo access token needed for production video access'
        },
        responseTime: Date.now() - vimeoStart
      });
    }
  } catch (error) {
    results.push({
      service: 'Vimeo API',
      status: 'warning',
      message: 'Vimeo API not available (development mode active)',
      details: {
        error: String(error),
        note: 'This is expected without Vimeo credentials'
      },
      responseTime: Date.now() - vimeoStart
    });
  }

  // Summary
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  console.log(`[API Test] Completed: ${successCount} success, ${errorCount} errors, ${warningCount} warnings`);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful: successCount,
      errors: errorCount,
      warnings: warningCount,
      overallStatus: errorCount === 0 ? (warningCount === 0 ? 'healthy' : 'operational') : 'degraded'
    },
    results,
    recommendations: [
      ...(missingEnvVars.includes('VIMEO_ACCESS_TOKEN') ? 
        ['Get Vimeo API credentials for video processing features'] : []),
      ...(errorCount > 0 ? 
        ['Fix API connection errors before production deployment'] : []),
      ...(successCount >= 5 ? 
        ['Core platform ready for use - database and main APIs operational'] : [])
    ]
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
} 