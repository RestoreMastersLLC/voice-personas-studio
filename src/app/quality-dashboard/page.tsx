'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/shared/Navigation';
import { 
  BarChart3,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Settings,
  Zap,
  Target,
  Gauge,
  Waves,
  Brain,
  Mic,
  RefreshCw
} from 'lucide-react';

interface VoiceQualityOverview {
  totalVoices: number;
  averageQuality: number;
  productionReady: number;
  needsImprovement: number;
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
  lastCalibration: string;
}

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

interface CacheStatus {
  hit: boolean;
  timestamp: string;
  expiresAt?: string;
  cacheAge?: number;
  learningIteration?: number;
  fresh?: boolean;
}

interface LearningStatus {
  enabled: boolean;
  lastUpdate: string | null;
  iterationCount: number;
  qualityTrends: number;
}

export default function QualityDashboardPage() {
  const [overview, setOverview] = useState<VoiceQualityOverview>({
    totalVoices: 12,
    averageQuality: 0.82,
    productionReady: 8,
    needsImprovement: 4,
    systemHealth: 'good',
    lastCalibration: '2024-01-15'
  });

  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    hit: false,
    timestamp: new Date().toISOString(),
    fresh: true
  });
  const [learningStatus, setLearningStatus] = useState<LearningStatus>({
    enabled: false,
    lastUpdate: null,
    iterationCount: 0,
    qualityTrends: 0
  });

  useEffect(() => {
    loadQualityData();
  }, []);

  const loadQualityData = async (forceRefresh: boolean = false) => {
    try {
      console.log('[Quality Dashboard] Loading quality data...');
      
      // Use dedicated quality dashboard API endpoint with cache control
      const url = forceRefresh ? '/api/quality-dashboard?refresh=true' : '/api/quality-dashboard';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load quality dashboard data: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load quality dashboard data');
      }
      
      console.log('[Quality Dashboard] Loaded quality data:', data.data);
      console.log('[Quality Dashboard] Cache status:', data.cache);
      console.log('[Quality Dashboard] Learning status:', data.learning);
      
      // Update overview and metrics with real data
      setOverview(data.data.overview);
      setQualityMetrics(data.data.metrics);
      
      // Update cache and learning status
      if (data.cache) {
        setCacheStatus(data.cache);
      }
      if (data.learning) {
        setLearningStatus(data.learning);
      }
      
      console.log(`[Quality Dashboard] ✅ Quality data loaded ${data.cache?.hit ? '(from cache)' : '(fresh)'}`);
      
    } catch (error) {
      console.error('[Quality Dashboard] Error loading quality data:', error);
      
      // Show error state instead of falling back to sample data
      setOverview(prev => ({
        ...prev,
        totalVoices: 0,
        averageQuality: 0,
        productionReady: 0,
        needsImprovement: 0,
        systemHealth: 'poor'
      }));
      
      setQualityMetrics([]);
    }
    setIsLoading(false);
  };

  // Refresh quality data by reloading from API
  const refreshQualityData = async () => {
    setIsLoading(true);
    await loadQualityData(false); // Use cache if available
  };

  // Force refresh bypassing cache
  const forceRefreshQualityData = async () => {
    setIsLoading(true);
    await loadQualityData(true); // Force fresh analysis
  };

  // Clear cache and refresh
  const clearCacheAndRefresh = async () => {
    try {
      console.log('[Quality Dashboard] Clearing cache...');
      await fetch('/api/quality-dashboard/cache-status', { method: 'DELETE' });
      await forceRefreshQualityData();
    } catch (error) {
      console.error('[Quality Dashboard] Error clearing cache:', error);
      await forceRefreshQualityData();
    }
  };

  // Check cache status
  const checkCacheStatus = async () => {
    try {
      const response = await fetch('/api/quality-dashboard/cache-status');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCacheStatus(data.cache);
          setLearningStatus(data.learning);
        }
      }
    } catch (error) {
      console.error('[Quality Dashboard] Error checking cache status:', error);
    }
  };

  const runSystemCalibration = async () => {
    setIsCalibrating(true);
    try {
      console.log('[Quality Dashboard] Running system calibration...');
      
      // Force re-analyze all voices for fresh quality metrics
      await forceRefreshQualityData();
      
      // Update calibration timestamp
      setOverview(prev => ({
        ...prev,
        lastCalibration: new Date().toISOString().split('T')[0]
      }));
      
      console.log('[Quality Dashboard] ✅ System calibration completed');
    } catch (error) {
      console.error('[Quality Dashboard] Calibration failed:', error);
    }
    setIsCalibrating(false);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-400 bg-green-900/20 border-green-600/30';
      case 'good': return 'text-blue-400 bg-blue-900/20 border-blue-600/30';
      case 'fair': return 'text-yellow-400 bg-yellow-900/20 border-yellow-600/30';
      case 'poor': return 'text-red-400 bg-red-900/20 border-red-600/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-600/30';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.85) return 'text-green-400';
    if (score >= 0.75) return 'text-blue-400';
    if (score >= 0.65) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityWidth = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Navigation />
      
      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        {/* Header */}
        <div className="border-b border-gray-800 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Global Quality Dashboard
                  </h1>
                </div>
                <p className="text-gray-400 text-lg mb-3">
                  System-wide voice quality monitoring, analysis, and calibration
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 border ${getHealthColor(overview.systemHealth)}`}>
                    <Activity className="h-3 w-3" />
                    System Health: {overview.systemHealth.charAt(0).toUpperCase() + overview.systemHealth.slice(1)}
                  </span>
                  <span className="px-3 py-1 text-xs bg-purple-900 text-purple-300 rounded-full flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {Math.round(overview.averageQuality * 100)}% Avg Quality
                  </span>
                  <span className="px-3 py-1 text-xs bg-green-900 text-green-300 rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {overview.productionReady} Production Ready
                  </span>
                  <span className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                    cacheStatus.hit ? 'bg-blue-900 text-blue-300' : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    <RefreshCw className="h-3 w-3" />
                    {cacheStatus.hit ? `Cached (${cacheStatus.cacheAge}m ago)` : 'Fresh Data'}
                  </span>
                  {learningStatus.enabled && (
                    <span className="px-3 py-1 text-xs bg-indigo-900 text-indigo-300 rounded-full flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      Learning: {learningStatus.iterationCount} iterations
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshQualityData}
                    disabled={isLoading || isCalibrating}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 rounded-lg transition-colors"
                    title="Refresh data (uses cache if available)"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>Refresh</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={forceRefreshQualityData}
                    disabled={isLoading || isCalibrating}
                    className="flex items-center space-x-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:opacity-50 rounded-lg transition-colors"
                    title="Force fresh analysis (bypasses cache)"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Force Refresh</span>
                  </button>
                  
                  <button
                    onClick={clearCacheAndRefresh}
                    disabled={isLoading || isCalibrating}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 rounded-lg transition-colors"
                    title="Clear cache and refresh"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Clear Cache</span>
                  </button>
                </div>
                
                <button
                  onClick={runSystemCalibration}
                  disabled={isCalibrating || isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {isCalibrating ? (
                    <>
                      <Waves className="h-4 w-4 animate-pulse" />
                      <span>Calibrating...</span>
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4" />
                      <span>Run Calibration</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Voices</p>
                  <p className="text-3xl font-bold text-white">{overview.totalVoices}</p>
                </div>
                <div className="p-3 bg-blue-900/20 rounded-lg">
                  <Mic className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Average Quality</p>
                  <p className={`text-3xl font-bold ${getQualityColor(overview.averageQuality)}`}>
                    {Math.round(overview.averageQuality * 100)}%
                  </p>
                </div>
                <div className="p-3 bg-purple-900/20 rounded-lg">
                  <Gauge className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Production Ready</p>
                  <p className="text-3xl font-bold text-green-400">{overview.productionReady}</p>
                </div>
                <div className="p-3 bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Need Work</p>
                  <p className="text-3xl font-bold text-yellow-400">{overview.needsImprovement}</p>
                </div>
                <div className="p-3 bg-yellow-900/20 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'overview', label: 'Quality Overview', icon: BarChart3 },
              { id: 'calibration', label: 'System Calibration', icon: Settings },
              { id: 'analysis', label: 'AI Analysis', icon: Brain },
              { id: 'trends', label: 'Quality Trends', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Voice Quality Table */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-6 text-white">Voice Quality Breakdown</h3>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
                      <span className="text-gray-400">Loading voice quality data...</span>
                    </div>
                  </div>
                ) : qualityMetrics.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No voice personas found</p>
                      <p className="text-gray-500 text-sm">Create some voice personas to see quality metrics</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-300">Voice Name</th>
                          <th className="text-center py-3 px-4 text-gray-300">Overall</th>
                          <th className="text-center py-3 px-4 text-gray-300">Accuracy</th>
                          <th className="text-center py-3 px-4 text-gray-300">Clarity</th>
                          <th className="text-center py-3 px-4 text-gray-300">Naturalness</th>
                          <th className="text-center py-3 px-4 text-gray-300">Status</th>
                          <th className="text-left py-3 px-4 text-gray-300">Last Tested</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qualityMetrics.map((metric) => (
                          <tr key={metric.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="py-4 px-4">
                              <div className="font-medium text-white">{metric.voiceName}</div>
                            </td>
                            <td className="text-center py-4 px-4">
                              <span className={`font-bold ${getQualityColor(metric.overall)}`}>
                                {Math.round(metric.overall * 100)}%
                              </span>
                            </td>
                            <td className="text-center py-4 px-4">
                              <span className={getQualityColor(metric.transcriptionAccuracy)}>
                                {Math.round(metric.transcriptionAccuracy * 100)}%
                              </span>
                            </td>
                            <td className="text-center py-4 px-4">
                              <span className={getQualityColor(metric.audioClarity)}>
                                {Math.round(metric.audioClarity * 100)}%
                              </span>
                            </td>
                            <td className="text-center py-4 px-4">
                              <span className={getQualityColor(metric.naturalness)}>
                                {Math.round(metric.naturalness * 100)}%
                              </span>
                            </td>
                            <td className="text-center py-4 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                metric.isProductionReady 
                                  ? 'bg-green-900/30 text-green-300' 
                                  : 'bg-yellow-900/30 text-yellow-300'
                              }`}>
                                {metric.isProductionReady ? '✅ Ready' : '⚠️ Review'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-gray-400 text-sm">
                              {new Date(metric.lastTested).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">System Recommendations</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-blue-300 font-medium">Quality Baseline Established</p>
                      <p className="text-blue-200 text-sm">System calibration shows consistent quality across {overview.productionReady} production voices</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 font-medium">Improvement Opportunities</p>
                      <p className="text-yellow-200 text-sm">{overview.needsImprovement} voices need quality improvements. Consider re-cloning with higher quality source audio.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calibration' && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-6 text-white">System Calibration & Baseline</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">Quality Thresholds</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-gray-300">Production Ready Threshold</span>
                      <span className="text-green-400 font-medium">≥ 75%</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-gray-300">Transcription Accuracy</span>
                      <span className="text-blue-400 font-medium">≥ 80%</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-gray-300">Audio Clarity</span>
                      <span className="text-purple-400 font-medium">≥ 70%</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-gray-300">Naturalness</span>
                      <span className="text-pink-400 font-medium">≥ 65%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">Calibration Status</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">Whisper Integration</span>
                      </div>
                      <span className="text-green-400 text-sm">Calibrated</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-gray-300">ElevenLabs API</span>
                      </div>
                      <span className="text-green-400 text-sm">Operational</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-yellow-400" />
                        <span className="text-gray-300">Quality Analyzer</span>
                      </div>
                      <span className="text-yellow-400 text-sm">Optimizing</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
                    <p className="text-green-300 text-sm">
                      <strong>Last Calibration:</strong> {overview.lastCalibration}
                    </p>
                    <p className="text-green-200 text-xs mt-1">
                      System baseline established. Quality thresholds optimized for production use.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cache & Learning Status */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-300">Cache & Learning Status</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className={`h-4 w-4 ${cacheStatus.hit ? 'text-blue-400' : 'text-yellow-400'}`} />
                      <span className="text-gray-300">Cache Status</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm ${cacheStatus.hit ? 'text-blue-400' : 'text-yellow-400'}`}>
                        {cacheStatus.hit ? 'Hit' : 'Miss/Fresh'}
                      </span>
                      {cacheStatus.cacheAge && (
                        <p className="text-xs text-gray-400">
                          {cacheStatus.cacheAge} minutes old
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Brain className={`h-4 w-4 ${learningStatus.enabled ? 'text-indigo-400' : 'text-gray-400'}`} />
                      <span className="text-gray-300">Learning System</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm ${learningStatus.enabled ? 'text-indigo-400' : 'text-gray-400'}`}>
                        {learningStatus.enabled ? 'Active' : 'Disabled'}
                      </span>
                      {learningStatus.enabled && (
                        <p className="text-xs text-gray-400">
                          {learningStatus.iterationCount} iterations
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-purple-400" />
                      <span className="text-gray-300">Quality Trends</span>
                    </div>
                    <span className="text-purple-400 text-sm">
                      {learningStatus.qualityTrends} data points
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-green-400" />
                      <span className="text-gray-300">Last Sync</span>
                    </div>
                    <span className="text-green-400 text-sm">
                      {new Date(cacheStatus.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                                 <div className="mt-6 p-4 bg-indigo-900/20 border border-indigo-600/30 rounded-lg">
                   <p className="text-indigo-300 text-sm">
                     <strong>Cache Configuration:</strong> 30min TTL, 4hr force refresh
                   </p>
                   <p className="text-indigo-200 text-xs mt-1">
                     Auto-refresh when learning system advances by 5+ iterations. 
                     {learningStatus.enabled && learningStatus.lastUpdate && (
                       ` Last learning update: ${new Date(learningStatus.lastUpdate).toLocaleString()}`
                     )}
                   </p>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {/* AI Quality Analysis */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-6 text-white">AI Quality Analysis</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Performance Distribution */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-300">Performance Distribution</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Excellent (≥85%)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{width: `${getQualityWidth(qualityMetrics.filter(m => m.overall >= 0.85).length, qualityMetrics.length)}%`}}
                            ></div>
                          </div>
                          <span className="text-green-400 font-medium">{qualityMetrics.filter(m => m.overall >= 0.85).length}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Good (75-84%)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{width: `${getQualityWidth(qualityMetrics.filter(m => m.overall >= 0.75 && m.overall < 0.85).length, qualityMetrics.length)}%`}}
                            ></div>
                          </div>
                          <span className="text-blue-400 font-medium">{qualityMetrics.filter(m => m.overall >= 0.75 && m.overall < 0.85).length}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Needs Work (&lt;75%)</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full"
                              style={{width: `${getQualityWidth(qualityMetrics.filter(m => m.overall < 0.75).length, qualityMetrics.length)}%`}}
                            ></div>
                          </div>
                          <span className="text-yellow-400 font-medium">{qualityMetrics.filter(m => m.overall < 0.75).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-300">Top Performing Voices</h4>
                    
                    <div className="space-y-3">
                      {qualityMetrics
                        .sort((a, b) => b.overall - a.overall)
                        .slice(0, 5)
                        .map((voice, index) => (
                          <div key={voice.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-yellow-500 text-yellow-900' :
                                index === 1 ? 'bg-gray-400 text-gray-900' :
                                index === 2 ? 'bg-amber-600 text-amber-100' :
                                'bg-gray-600 text-gray-300'
                              }`}>
                                {index + 1}
                              </div>
                              <span className="text-gray-300 truncate">{voice.voiceName.split('_')[0] || voice.voiceName}</span>
                            </div>
                            <span className={`font-bold ${getQualityColor(voice.overall)}`}>
                              {Math.round(voice.overall * 100)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Insights */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-6 text-white">Quality Insights</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <span className="text-green-300 font-medium">System Strength</span>
                    </div>
                    <p className="text-green-200 text-sm">
                      {overview.productionReady === overview.totalVoices ? 
                        'All voices meet production standards' : 
                        `${Math.round((overview.productionReady / overview.totalVoices) * 100)}% production ready`}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      <span className="text-blue-300 font-medium">Quality Consistency</span>
                    </div>
                    <p className="text-blue-200 text-sm">
                      {qualityMetrics.length > 0 ? 
                        `±${Math.round(Math.max(...qualityMetrics.map(m => m.overall)) * 100 - Math.min(...qualityMetrics.map(m => m.overall)) * 100)}% variance` :
                        'No variance data'}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-900/20 border border-purple-600/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-5 w-5 text-purple-400" />
                      <span className="text-purple-300 font-medium">Recommendation</span>
                    </div>
                    <p className="text-purple-200 text-sm">
                      {overview.averageQuality >= 0.85 ? 
                        'System optimally calibrated' :
                        overview.averageQuality >= 0.75 ?
                        'Consider voice optimization' :
                        'Voice quality improvements needed'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* Quality Trends */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-6 text-white">Quality Trends & Analytics</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-sm">Current Average</span>
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{Math.round(overview.averageQuality * 100)}%</div>
                    <div className="text-xs text-green-400">Optimized for production</div>
                  </div>
                  
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-sm">Production Ready</span>
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{Math.round((overview.productionReady / overview.totalVoices) * 100)}%</div>
                    <div className="text-xs text-blue-400">{overview.productionReady} of {overview.totalVoices} voices</div>
                  </div>
                  
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300 text-sm">Quality Variance</span>
                      <Gauge className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {qualityMetrics.length > 0 ? 
                        `±${Math.round(Math.max(...qualityMetrics.map(m => m.overall)) * 100 - Math.min(...qualityMetrics.map(m => m.overall)) * 100)}%` :
                        '±0%'}
                    </div>
                    <div className="text-xs text-purple-400">Low variance = consistent quality</div>
                  </div>
                </div>

                {/* Voice Performance Comparison */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">Voice Performance Comparison</h4>
                  
                  {qualityMetrics
                    .sort((a, b) => b.overall - a.overall)
                    .map((voice, index) => (
                      <div key={voice.id} className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg">
                        <div className="w-4 text-center">
                          <span className="text-gray-400 text-sm">{index + 1}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium truncate">{voice.voiceName.split('_')[0] || voice.voiceName}</span>
                            <span className={`font-bold ${getQualityColor(voice.overall)}`}>
                              {Math.round(voice.overall * 100)}%
                            </span>
                          </div>
                          
                          <div className="flex gap-4 text-xs">
                            <div>
                              <span className="text-gray-400">Accuracy: </span>
                              <span className={getQualityColor(voice.transcriptionAccuracy)}>
                                {Math.round(voice.transcriptionAccuracy * 100)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Clarity: </span>
                              <span className={getQualityColor(voice.audioClarity)}>
                                {Math.round(voice.audioClarity * 100)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Natural: </span>
                              <span className={getQualityColor(voice.naturalness)}>
                                {Math.round(voice.naturalness * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-24 bg-gray-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              voice.overall >= 0.85 ? 'bg-green-500' :
                              voice.overall >= 0.75 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{width: `${voice.overall * 100}%`}}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* System Health Status */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-6 text-white">System Health & Reliability</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-300">Metric Breakdown</h4>
                    
                    {['transcriptionAccuracy', 'audioClarity', 'naturalness'].map((metric) => {
                      const values = qualityMetrics.map(m => m[metric as keyof QualityMetric] as number);
                      const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                      const metricName = metric === 'transcriptionAccuracy' ? 'Transcription' : 
                                       metric === 'audioClarity' ? 'Audio Clarity' : 'Naturalness';
                      
                      return (
                        <div key={metric} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                          <span className="text-gray-300">{metricName}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-600 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{width: `${average * 100}%`}}
                              ></div>
                            </div>
                            <span className={`font-medium ${getQualityColor(average)}`}>
                              {Math.round(average * 100)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-300">System Status</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Voice Reliability</span>
                        <span className="text-green-400 font-medium">100%</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">API Uptime</span>
                        <span className="text-green-400 font-medium">99.9%</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Quality Consistency</span>
                        <span className="text-blue-400 font-medium">Excellent</span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
                      <p className="text-green-300 text-sm font-medium">System Status: {overview.systemHealth.charAt(0).toUpperCase() + overview.systemHealth.slice(1)}</p>
                      <p className="text-green-200 text-xs mt-1">
                        {overview.productionReady === overview.totalVoices 
                          ? 'All voices performing above baseline thresholds'
                          : `${overview.productionReady}/${overview.totalVoices} voices ready for production`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 