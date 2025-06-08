#!/usr/bin/env node

/**
 * 🎭 Voice Personas Studio - Comprehensive Stress Test
 * Tests the complete workflow: Voice Cloning → Quality Analysis → AI Learning → Optimization
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

const log = (message, color = 'white') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const testResults = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

const baseUrl = 'http://localhost:3000';

// Test data from working voices
const testVoices = [
  { id: 'k3kIfA1pkAv19MoNZBuC', name: 'Learning Voice 3 🧠', expectedQuality: 83 },
  { id: 'b38NXZicYDBOKHOc4dge', name: 'Learning Voice 2 🧠', expectedQuality: 85 },
  { id: 'U0G02YU6z9q3sRTVVL3r', name: 'Learning Voice 1 🧠', expectedQuality: 85 }
];

const testTexts = [
  "Hello, this is a comprehensive quality test for voice analysis and system monitoring.",
  "Welcome to our advanced voice cloning platform. How does this sound to you?",
  "Testing voice consistency across different sentence structures and emotional tones."
];

const voiceSettings = [
  { stability: 0.75, similarityBoost: 0.85, style: 0.2, pitch: 0, useSpeakerBoost: true },
  { stability: 0.85, similarityBoost: 0.95, style: 0.15, pitch: 0, useSpeakerBoost: true },
  { stability: 0.80, similarityBoost: 0.90, style: 0.25, pitch: 0, useSpeakerBoost: true }
];

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return { blob: await response.blob(), headers: response.headers };
    }
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

async function recordTest(testName, passed, details = '') {
  testResults.totalTests++;
  if (passed) {
    testResults.passed++;
    log(`✅ ${testName}`, 'green');
  } else {
    testResults.failed++;
    log(`❌ ${testName}`, 'red');
  }
  
  testResults.details.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (details) {
    log(`   ${details}`, 'cyan');
  }
}

async function testSystemHealth() {
  log('\n🔍 TESTING SYSTEM HEALTH', 'bgBlue');
  
  // Test Quality Dashboard API
  try {
    const qualityData = await makeRequest('/api/quality-dashboard');
    await recordTest(
      'Quality Dashboard API', 
      qualityData.success, 
      `${qualityData.data?.overview?.totalVoices || 0} voices, ${((qualityData.data?.overview?.averageQuality || 0) * 100).toFixed(1)}% avg quality`
    );
  } catch (error) {
    await recordTest('Quality Dashboard API', false, error.message);
  }

  // Test Learning System API
  try {
    const learningData = await makeRequest('/api/learning-system/status');
    await recordTest(
      'Learning System API', 
      learningData.success, 
      `${learningData.learningData?.learningIterations || 0} iterations, ${learningData.learningData?.qualityTrends?.length || 0} trends`
    );
  } catch (error) {
    await recordTest('Learning System API', false, error.message);
  }

  // Test Voice Personas API
  try {
    const personasData = await makeRequest('/api/voice-personas');
    const isValid = Array.isArray(personasData) && personasData.length > 0;
    await recordTest(
      'Voice Personas API', 
      isValid, 
      `${personasData?.length || 0} personas loaded`
    );
  } catch (error) {
    await recordTest('Voice Personas API', false, error.message);
  }
}

async function testVoiceGeneration() {
  log('\n🎤 TESTING VOICE GENERATION & QUALITY ANALYSIS', 'bgMagenta');
  
  for (let i = 0; i < testVoices.length; i++) {
    const voice = testVoices[i];
    const text = testTexts[i % testTexts.length];
    const settings = voiceSettings[i % voiceSettings.length];
    
    try {
      const startTime = Date.now();
      
      const response = await makeRequest('/api/generate-speech', {
        method: 'POST',
        body: JSON.stringify({
          text,
          voiceId: voice.id,
          settings,
          analyzeQuality: true
        })
      });
      
      const responseTime = Date.now() - startTime;
      const success = response.blob && response.blob.size > 0;
      
      await recordTest(
        `Voice Generation - ${voice.name}`, 
        success, 
        `${responseTime}ms, Audio: ${response.blob?.size || 0} bytes`
      );
      
    } catch (error) {
      await recordTest(`Voice Generation - ${voice.name}`, false, error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function testCacheSystem() {
  log('\n⚡ TESTING CACHE SYSTEM PERFORMANCE', 'bgYellow');
  
  const testRuns = 5;
  const responseTimes = [];
  
  for (let i = 0; i < testRuns; i++) {
    try {
      const startTime = Date.now();
      await makeRequest('/api/quality-dashboard');
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      
      log(`   Run ${i + 1}: ${responseTime}ms`, 'yellow');
    } catch (error) {
      log(`   Run ${i + 1}: Error - ${error.message}`, 'red');
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const cacheEfficient = avgResponseTime < 200;
  
  await recordTest(
    'Cache System Performance', 
    cacheEfficient, 
    `Avg: ${avgResponseTime.toFixed(0)}ms, Min: ${Math.min(...responseTimes)}ms, Max: ${Math.max(...responseTimes)}ms`
  );
}

async function testLearningSystem() {
  log('\n🧠 TESTING AI LEARNING SYSTEM', 'bgCyan');
  
  try {
    const learningData = await makeRequest('/api/learning-system/status');
    
    if (learningData.success) {
      const currentIteration = learningData.learningData.learningIterations;
      const totalTrends = learningData.learningData.qualityTrends?.length || 0;
      const averageQuality = learningData.learningData.averageQuality;
      const systemPerformance = learningData.learningData.systemPerformance;
      
      // Calculate quality trend from recent data
      const recentTrends = learningData.learningData.qualityTrends.slice(-3);
      const qualityTrend = recentTrends.length >= 2 ? 
        ((recentTrends[recentTrends.length - 1].quality - recentTrends[0].quality) / recentTrends[0].quality * 100) : 0;
      
      await recordTest(
        'Learning System Status', 
        true, 
        `Iteration: ${currentIteration}, Quality: ${averageQuality.toFixed(1)}%, Trend: ${qualityTrend > 0 ? '+' : ''}${(qualityTrend || 0).toFixed(2)}%`
      );
      
      const hasValidData = currentIteration > 0 && totalTrends > 0 && averageQuality > 0;
      await recordTest(
        'Learning Data Integrity', 
        hasValidData, 
        `${totalTrends} data points, ${currentIteration} iterations`
      );
      
      // Test system performance metrics
      if (systemPerformance) {
        await recordTest(
          'System Performance Tracking', 
          systemPerformance.systemHealthScore >= 75, 
          `Health: ${systemPerformance.systemHealthScore}/100, Cache: ${systemPerformance.cacheEfficiency}%`
        );
      }
      
    } else {
      await recordTest('Learning System Status', false, 'Failed to load learning data');
    }
    
  } catch (error) {
    await recordTest('Learning System Status', false, error.message);
  }
}

async function testProductionReadiness() {
  log('\n🚀 TESTING PRODUCTION READINESS', 'bgGreen');
  
  try {
    const qualityData = await makeRequest('/api/quality-dashboard');
    
    if (qualityData.success) {
      const overview = qualityData.data.overview;
      
      const hasProductionVoices = overview.productionReady > 0;
      await recordTest(
        'Production Voice Availability', 
        hasProductionVoices, 
        `${overview.productionReady}/${overview.totalVoices} voices production-ready`
      );
      
      const qualityThreshold = 0.75;
      const meetsQualityStandard = overview.averageQuality >= qualityThreshold;
      await recordTest(
        'Quality Standards', 
        meetsQualityStandard, 
        `${(overview.averageQuality * 100).toFixed(1)}% avg quality (Required: ${qualityThreshold * 100}%)`
      );
      
    } else {
      await recordTest('Production Readiness Check', false, 'Failed to load quality data');
    }
    
  } catch (error) {
    await recordTest('Production Readiness Check', false, error.message);
  }
}

async function generateStressTestReport() {
  log('\n📊 COMPREHENSIVE STRESS TEST REPORT', 'bgWhite');
  log('='.repeat(80), 'white');
  
  const passRate = (testResults.passed / testResults.totalTests * 100).toFixed(1);
  const overallHealth = passRate >= 90 ? 'EXCELLENT' : passRate >= 75 ? 'GOOD' : passRate >= 60 ? 'FAIR' : 'NEEDS ATTENTION';
  
  log(`\n📈 OVERALL SYSTEM HEALTH: ${overallHealth} (${passRate}%)`, passRate >= 90 ? 'green' : passRate >= 75 ? 'yellow' : 'red');
  log(`\n📋 TEST SUMMARY:`, 'white');
  log(`   • Total Tests: ${testResults.totalTests}`, 'cyan');
  log(`   • Passed: ${testResults.passed} ✅`, 'green');
  log(`   • Failed: ${testResults.failed} ❌`, 'red');
  log(`   • Success Rate: ${passRate}%`, passRate >= 90 ? 'green' : 'yellow');
  
  if (testResults.failed > 0) {
    log(`\n🔍 FAILED TESTS:`, 'red');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        log(`   ❌ ${test.test}: ${test.details}`, 'red');
      });
  }
  
  log(`\n🎯 PERFORMANCE HIGHLIGHTS:`, 'green');
  testResults.details
    .filter(test => test.passed && test.details.includes('ms'))
    .forEach(test => {
      log(`   ✅ ${test.test}: ${test.details}`, 'green');
    });
    
  log(`\n🧠 AI LEARNING INSIGHTS:`, 'cyan');
  testResults.details
    .filter(test => test.test.includes('Learning') && test.passed)
    .forEach(test => {
      log(`   📊 ${test.test}: ${test.details}`, 'cyan');
    });
  
  log(`\n🔧 RECOMMENDATIONS:`, 'yellow');
  if (passRate >= 95) {
    log(`   🌟 Excellent performance! System ready for production deployment.`, 'green');
  } else if (passRate >= 85) {
    log(`   👍 Good performance. Monitor failed tests and optimize where needed.`, 'yellow');
  } else if (passRate >= 70) {
    log(`   ⚠️  Fair performance. Address failed tests before production.`, 'yellow');
  } else {
    log(`   🚨 Poor performance. Critical issues need immediate attention.`, 'red');
  }
  
  log('\n='.repeat(80), 'white');
  log(`🎭 Voice Personas Studio Stress Test Complete`, 'magenta');
  log(`⏰ Test completed at: ${new Date().toLocaleTimeString()}`, 'white');
  log('='.repeat(80), 'white');
}

async function runComprehensiveStressTest() {
  const startTime = Date.now();
  
  log('🎭 VOICE PERSONAS STUDIO - COMPREHENSIVE STRESS TEST', 'bgMagenta');
  log('🚀 Testing complete workflow: Voice Generation → Quality Analysis → AI Learning → Optimization\n', 'white');
  
  try {
    await testSystemHealth();
    await testVoiceGeneration();
    await testCacheSystem();
    await testLearningSystem();
    await testProductionReadiness();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n⏱️  Total test duration: ${duration} seconds`, 'white');
    
    await generateStressTestReport();
    
  } catch (error) {
    log(`\n🚨 Critical test failure: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the comprehensive stress test
if (require.main === module) {
  runComprehensiveStressTest().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runComprehensiveStressTest }; 