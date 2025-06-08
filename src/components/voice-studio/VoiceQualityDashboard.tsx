'use client';

import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, XCircle, Settings, Zap, Target, Brain } from 'lucide-react';

interface QualityMetrics {
  overall: number;
  transcriptionAccuracy: number;
  audioClarity: number;
  naturalness: number;
  similarity: number;
  technicalQuality: number;
  emotionalConsistency: number;
  isProductionReady: boolean;
  confidence: number;
  recommendations: string[];
}

interface VoiceQualityDashboardProps {
  qualityMetrics: QualityMetrics | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export default function VoiceQualityDashboard({ qualityMetrics, isAnalyzing, onAnalyze }: VoiceQualityDashboardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-400';
    if (score >= 0.8) return 'text-green-300';
    if (score >= 0.7) return 'text-yellow-400';
    if (score >= 0.6) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 0.9) return 'bg-green-500/20 border-green-500/30';
    if (score >= 0.8) return 'bg-green-500/15 border-green-500/25';
    if (score >= 0.7) return 'bg-yellow-500/20 border-yellow-500/30';
    if (score >= 0.6) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getProgressWidth = (score: number) => `${Math.round(score * 100)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Brain className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Voice Quality Dashboard</h3>
            <p className="text-sm text-gray-400">Production-grade quality analysis & monitoring</p>
          </div>
        </div>
        
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors text-white"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              <span>Run Analysis</span>
            </>
          )}
        </button>
      </div>

      {qualityMetrics ? (
        <>
          {/* Overall Quality Status */}
          <div className={`rounded-lg border p-6 ${getScoreBackground(qualityMetrics.overall)}`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Overall Quality Score</h4>
              {qualityMetrics.isProductionReady ? (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Production Ready</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-orange-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-medium">Needs Improvement</span>
                </div>
              )}
            </div>
            
            <div className="flex items-end space-x-4">
              <div className={`text-4xl font-bold ${getScoreColor(qualityMetrics.overall)}`}>
                {Math.round(qualityMetrics.overall * 100)}%
              </div>
              <div className="flex-1">
                <div className="bg-gray-700 rounded-full h-3 mb-2">
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      qualityMetrics.overall >= 0.8 ? 'bg-green-500' : 
                      qualityMetrics.overall >= 0.7 ? 'bg-yellow-500' : 
                      qualityMetrics.overall >= 0.6 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: getProgressWidth(qualityMetrics.overall) }}
                  ></div>
                </div>
                <div className="text-sm text-gray-400">
                  AI Confidence: {Math.round(qualityMetrics.confidence * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Transcription Accuracy', value: qualityMetrics.transcriptionAccuracy, icon: BarChart3, desc: 'Speech clarity' },
              { label: 'Audio Clarity', value: qualityMetrics.audioClarity, icon: Zap, desc: 'Technical quality' },
              { label: 'Naturalness', value: qualityMetrics.naturalness, icon: Brain, desc: 'Human-like quality' },
              { label: 'Emotional Consistency', value: qualityMetrics.emotionalConsistency, icon: TrendingUp, desc: 'Expression quality' }
            ].map((metric, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <metric.icon className="h-5 w-5 text-gray-400" />
                  <div className={`text-lg font-bold ${getScoreColor(metric.value)}`}>
                    {Math.round(metric.value * 100)}%
                  </div>
                </div>
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-white">{metric.label}</h5>
                  <div className="bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-700 ${
                        metric.value >= 0.8 ? 'bg-green-500' : 
                        metric.value >= 0.7 ? 'bg-yellow-500' : 
                        metric.value >= 0.6 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: getProgressWidth(metric.value) }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400">{metric.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* AI Recommendations */}
          {qualityMetrics.recommendations && qualityMetrics.recommendations.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="h-5 w-5 text-blue-400" />
                <h4 className="text-lg font-semibold text-blue-300">AI Recommendations</h4>
              </div>
              
              <div className="space-y-3">
                {qualityMetrics.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600/30 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs text-blue-300 font-medium">{index + 1}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality Thresholds Reference */}
          <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Target className="h-5 w-5 text-gray-400" />
              <span>Production Quality Standards</span>
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">90-100%: Excellent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">80-89%: Good</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300">70-79%: Fair</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">&lt;70%: Poor</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-700/30 rounded border border-gray-600/30">
              <p className="text-xs text-gray-400">
                <strong>Production Ready Requirements:</strong> 80%+ Overall Score, 85%+ Transcription Accuracy, 75%+ Audio Clarity & Naturalness
              </p>
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-blue-600/20 rounded-full">
              <Brain className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">No Quality Analysis Yet</h4>
              <p className="text-gray-400 mb-4">Run an AI quality analysis to see detailed metrics and recommendations</p>
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors text-white mx-auto"
              >
                <Target className="h-5 w-5" />
                <span>Start Quality Analysis</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 