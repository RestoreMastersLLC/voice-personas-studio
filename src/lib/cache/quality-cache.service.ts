import fs from 'fs';
import path from 'path';

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

interface QualityOverview {
  totalVoices: number;
  averageQuality: number;
  productionReady: number;
  needsImprovement: number;
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
  lastCalibration: string;
}

interface CachedQualityData {
  overview: QualityOverview;
  metrics: QualityMetric[];
  timestamp: string;
  expiresAt: string;
  cacheVersion: string;
  learningIteration: number;
}

interface CacheConfig {
  maxAge: number; // milliseconds
  forceRefreshThreshold: number; // hours
  learningUpdateThreshold: number; // iterations
  enableLearningIntegration: boolean;
}

class QualityCacheService {
  private cachePath = path.join(process.cwd(), 'quality-dashboard-cache.json');
  private learningDataPath = path.join(process.cwd(), 'enhanced_learning_data.json');
  private fallbackLearningDataPath = path.join(process.cwd(), 'voice_learning_data.json');
  private config: CacheConfig;

  constructor() {
    this.config = {
      maxAge: 30 * 60 * 1000, // 30 minutes default
      forceRefreshThreshold: 4, // Force refresh after 4 hours
      learningUpdateThreshold: 5, // Refresh when learning iterations increase by 5
      enableLearningIntegration: true
    };
  }

  /**
   * Get cached quality data if valid, otherwise return null
   */
  async getCachedData(): Promise<CachedQualityData | null> {
    try {
      if (!fs.existsSync(this.cachePath)) {
        console.log('[QualityCache] No cache file found');
        return null;
      }

      const cacheData: CachedQualityData = JSON.parse(
        fs.readFileSync(this.cachePath, 'utf8')
      );

      // Check if cache is expired
      const now = new Date();
      const expiresAt = new Date(cacheData.expiresAt);
      
      if (now > expiresAt) {
        console.log('[QualityCache] Cache expired, needs refresh');
        return null;
      }

      // Check if force refresh threshold is reached
      const cacheAge = now.getTime() - new Date(cacheData.timestamp).getTime();
      const forceRefreshMs = this.config.forceRefreshThreshold * 60 * 60 * 1000;
      
      if (cacheAge > forceRefreshMs) {
        console.log('[QualityCache] Force refresh threshold reached');
        return null;
      }

      // Check learning system integration
      if (this.config.enableLearningIntegration) {
        const learningData = this.loadLearningData();
        if (learningData && learningData.learningIterations) {
          const iterationDiff = learningData.learningIterations - cacheData.learningIteration;
          if (iterationDiff >= this.config.learningUpdateThreshold) {
            console.log(`[QualityCache] Learning system updated (${iterationDiff} new iterations), refreshing cache`);
            return null;
          }
        }
      }

      console.log(`[QualityCache] Using cached data from ${cacheData.timestamp}`);
      return cacheData;

    } catch (error) {
      console.error('[QualityCache] Error reading cache:', error);
      return null;
    }
  }

  /**
   * Cache quality data with learning integration
   */
  async setCachedData(overview: QualityOverview, metrics: QualityMetric[]): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.config.maxAge);
      const learningData = this.loadLearningData();

      const cacheData: CachedQualityData = {
        overview,
        metrics,
        timestamp: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        cacheVersion: '1.0.0',
        learningIteration: learningData?.learningIterations || 0
      };

      fs.writeFileSync(this.cachePath, JSON.stringify(cacheData, null, 2));
      
      console.log(`[QualityCache] Cached quality data for ${metrics.length} voices`);
      console.log(`[QualityCache] Cache expires at: ${expiresAt.toLocaleString()}`);
      console.log(`[QualityCache] Learning iteration: ${cacheData.learningIteration}`);

      // Update learning system with quality insights
      if (this.config.enableLearningIntegration) {
        this.updateLearningSystemWithQualityData(overview, metrics);
      }

    } catch (error) {
      console.error('[QualityCache] Error writing cache:', error);
    }
  }

  /**
   * Load learning system data
   */
  private loadLearningData(): any {
    try {
      if (fs.existsSync(this.learningDataPath)) {
        return JSON.parse(fs.readFileSync(this.learningDataPath, 'utf8'));
      }
    } catch (error) {
      console.error('[QualityCache] Error loading learning data:', error);
    }
    return null;
  }

  /**
   * Update learning system with quality insights
   */
  private updateLearningSystemWithQualityData(overview: QualityOverview, metrics: QualityMetric[]): void {
    try {
      const learningData = this.loadLearningData();
      if (!learningData) return;

      // Update quality trends in learning system
      const qualityTrends = learningData.qualityTrends || [];
      qualityTrends.push({
        timestamp: new Date().toISOString(),
        averageQuality: overview.averageQuality,
        productionReady: overview.productionReady,
        systemHealth: overview.systemHealth,
        totalVoices: overview.totalVoices,
        cacheSync: true
      });

      // Keep only last 50 quality trend entries
      if (qualityTrends.length > 50) {
        qualityTrends.splice(0, qualityTrends.length - 50);
      }

      // Update voice analytics with quality metrics
      metrics.forEach(metric => {
        if (!learningData.voiceAnalytics) learningData.voiceAnalytics = {};
        
        learningData.voiceAnalytics[metric.id] = {
          ...learningData.voiceAnalytics[metric.id],
          lastQualityCheck: metric.lastTested,
          qualityScore: metric.overall,
          productionReady: metric.isProductionReady,
          transcriptionAccuracy: metric.transcriptionAccuracy,
          audioClarity: metric.audioClarity,
          naturalness: metric.naturalness,
          recommendations: metric.recommendations
        };
      });

      // Update system performance metrics
      learningData.systemPerformance = {
        lastQualitySync: new Date().toISOString(),
        averageSystemQuality: overview.averageQuality,
        systemHealthScore: this.getHealthScore(overview.systemHealth),
        qualityTrendDirection: this.calculateQualityTrend(qualityTrends),
        cacheEfficiency: this.calculateCacheEfficiency()
      };

      learningData.qualityTrends = qualityTrends;

      // Save updated learning data
      fs.writeFileSync(this.learningDataPath, JSON.stringify(learningData, null, 2));
      
      console.log('[QualityCache] Updated learning system with quality insights');

    } catch (error) {
      console.error('[QualityCache] Error updating learning system:', error);
    }
  }

  /**
   * Convert system health to numeric score for learning
   */
  private getHealthScore(health: string): number {
    const scores = { excellent: 95, good: 80, fair: 65, poor: 40 };
    return scores[health as keyof typeof scores] || 0;
  }

  /**
   * Calculate quality trend direction for learning
   */
  private calculateQualityTrend(trends: any[]): string {
    if (trends.length < 3) return 'insufficient_data';
    
    const recent = trends.slice(-5);
    const firstAvg = recent[0].averageQuality;
    const lastAvg = recent[recent.length - 1].averageQuality;
    const improvement = lastAvg - firstAvg;
    
    if (improvement > 0.05) return 'improving';
    if (improvement < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Calculate cache efficiency metrics
   */
  private calculateCacheEfficiency(): number {
    try {
      const stats = fs.statSync(this.cachePath);
      const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
      const maxAgeMinutes = this.config.maxAge / (1000 * 60);
      
      return Math.round((1 - (ageMinutes / maxAgeMinutes)) * 100);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get cache status information
   */
  async getCacheStatus(): Promise<{
    isValid: boolean;
    lastSync: string | null;
    expiresAt: string | null;
    cacheAge: number; // minutes
    learningIteration: number;
    needsRefresh: boolean;
  }> {
    try {
      const cachedData = await this.getCachedData();
      
      if (!cachedData) {
        return {
          isValid: false,
          lastSync: null,
          expiresAt: null,
          cacheAge: 0,
          learningIteration: 0,
          needsRefresh: true
        };
      }

      const now = new Date();
      const cacheAge = (now.getTime() - new Date(cachedData.timestamp).getTime()) / (1000 * 60);
      const forceRefreshMinutes = this.config.forceRefreshThreshold * 60;
      
      return {
        isValid: true,
        lastSync: cachedData.timestamp,
        expiresAt: cachedData.expiresAt,
        cacheAge: Math.round(cacheAge),
        learningIteration: cachedData.learningIteration,
        needsRefresh: cacheAge > forceRefreshMinutes
      };

    } catch (error) {
      console.error('[QualityCache] Error getting cache status:', error);
      return {
        isValid: false,
        lastSync: null,
        expiresAt: null,
        cacheAge: 0,
        learningIteration: 0,
        needsRefresh: true
      };
    }
  }

  /**
   * Force cache invalidation
   */
  async invalidateCache(): Promise<void> {
    try {
      if (fs.existsSync(this.cachePath)) {
        fs.unlinkSync(this.cachePath);
        console.log('[QualityCache] Cache invalidated');
      }
    } catch (error) {
      console.error('[QualityCache] Error invalidating cache:', error);
    }
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[QualityCache] Cache configuration updated:', this.config);
  }

  /**
   * Get learning system integration status
   */
  getLearningIntegrationStatus(): {
    enabled: boolean;
    lastUpdate: string | null;
    iterationCount: number;
    qualityTrends: number;
  } {
    try {
      const learningData = this.loadLearningData();
      
      return {
        enabled: this.config.enableLearningIntegration,
        lastUpdate: learningData?.systemPerformance?.lastQualitySync || null,
        iterationCount: learningData?.learningIterations || 0,
        qualityTrends: learningData?.qualityTrends?.length || 0
      };
    } catch (error) {
      return {
        enabled: false,
        lastUpdate: null,
        iterationCount: 0,
        qualityTrends: 0
      };
    }
  }
}

// Export singleton instance
export const qualityCacheService = new QualityCacheService(); 