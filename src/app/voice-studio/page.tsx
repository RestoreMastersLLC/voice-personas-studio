'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/shared/Navigation';
import VoiceStudio from '@/components/voice-studio/VoiceStudio';
import { 
  Sliders,
  Mic,
  BarChart3,
  Zap
} from 'lucide-react';

interface VoicePersona {
  id: string;
  name: string;
  accent: string;
  age: number;
  tone: string;
  energy: string;
  description: string;
  avatar: string;
  voiceSettings: string | object;
  similarity?: {
    overall: number;
    pitch: number;
    tone: number;
    accent: number;
    pace: number;
    clarity: number;
    confidence: number;
    details: {
      frequencyAnalysis: number;
      formantMatching: number;
      prosodyAlignment: number;
      spectralSimilarity: number;
    };
  };
  characteristics?: {
    pitch: { average: number; range: number; variation: number };
    tone: { warmth: number; brightness: number; depth: number };
    pace: { wordsPerMinute: number; pauseFrequency: number; rhythm: number };
    quality: { clarity: number; consistency: number; naturalness: number };
  };
}

export default function VoiceStudioPage() {
  const [voices, setVoices] = useState<VoicePersona[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoicePersona | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStudio, setShowStudio] = useState(false);

  useEffect(() => {
    loadVoices();
  }, []);

  // Helper function to safely get voice similarity
  const getVoiceSimilarity = (voiceSettings: string | object): number => {
    try {
      if (!voiceSettings) return 0;
      
      let settings;
      if (typeof voiceSettings === 'string') {
        settings = JSON.parse(voiceSettings);
      } else {
        settings = voiceSettings;
      }
      
      return settings?.similarity?.overall || 0;
    } catch {
      return 0;
    }
  };

  const loadVoices = async () => {
    try {
      const response = await fetch('/api/voice-personas');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVoices(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading voices:', error);
    }
    setIsLoading(false);
  };

  const handleVoiceSelect = (voice: VoicePersona) => {
    setSelectedVoice(voice);
    setShowStudio(true);
  };

  const handleStudioClose = () => {
    setShowStudio(false);
    setSelectedVoice(null);
  };

  const handleSaveSettings = (settings: object) => {
    console.log('Saving voice settings:', settings);
    // Implement settings save logic here
  };

  if (showStudio && selectedVoice) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <Navigation />
        <div className="flex-1 lg:pl-64">
          <VoiceStudio 
            persona={selectedVoice}
            onSave={handleSaveSettings}
            onClose={handleStudioClose}
          />
        </div>
      </div>
    );
  }

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
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Sliders className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Voice Studio Professional
                  </h1>
                </div>
                <p className="text-gray-400 text-lg mb-3">
                  Professional voice testing, similarity analysis, and real-time generation
                </p>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs bg-green-900 text-green-300 rounded-full flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Real-time Generation
                  </span>
                  <span className="px-3 py-1 text-xs bg-blue-900 text-blue-300 rounded-full flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    85-95% Similarity
                  </span>
                  <span className="px-3 py-1 text-xs bg-purple-900 text-purple-300 rounded-full flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    Professional Controls
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Voice Selection */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Select Voice for Testing</h2>
            <p className="text-gray-400 mb-6">
              Choose a voice persona to open the professional testing studio with advanced controls and similarity analysis.
            </p>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-6 animate-pulse">
                    <div className="h-12 bg-gray-700 rounded mb-4"></div>
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    onClick={() => handleVoiceSelect(voice)}
                    className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-purple-500 hover:bg-gray-750 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">{voice.avatar}</div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          getVoiceSimilarity(voice.voiceSettings) >= 90
                            ? 'bg-green-900 text-green-300'
                            : getVoiceSimilarity(voice.voiceSettings) >= 80
                            ? 'bg-blue-900 text-blue-300'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {getVoiceSimilarity(voice.voiceSettings) > 0
                            ? `${getVoiceSimilarity(voice.voiceSettings)}% Similar`
                            : 'Voice Ready'
                          }
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      {voice.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {voice.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>{voice.accent}</span>
                        <span>{voice.tone}</span>
                        <span>{voice.energy} Energy</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-purple-400 group-hover:text-purple-300">
                          Open Studio →
                        </span>
                        <div className="flex items-center space-x-1">
                          <Sliders className="h-4 w-4 text-gray-500" />
                          <BarChart3 className="h-4 w-4 text-gray-500" />
                          <Mic className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features Overview */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-700/30 p-8">
            <h3 className="text-xl font-semibold text-white mb-4">Voice Studio Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <Sliders className="h-5 w-5 text-purple-300" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Professional Controls</h4>
                  <p className="text-sm text-purple-200">
                    Advanced sliders for stability, similarity boost, style, and pitch adjustment
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Similarity Analysis</h4>
                  <p className="text-sm text-purple-200">
                    Real-time voice matching metrics with detailed breakdown and confidence scores
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <Mic className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Real-time Testing</h4>
                  <p className="text-sm text-purple-200">
                    Instant voice generation, playback controls, and audio download capabilities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 