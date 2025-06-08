'use client';

import { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Download,
  Settings,
  Mic,
  Waves,
  BarChart3,
  Save,
  Volume2,
  ArrowLeft,
  Loader2,
  Brain
} from 'lucide-react';
import VoiceQualityDashboard from './VoiceQualityDashboard';

interface VoiceCharacteristics {
  pitch: {
    average: number;
    range: number;
    variation: number;
  };
  tone: {
    warmth: number;
    brightness: number;
    depth: number;
  };
  pace: {
    wordsPerMinute: number;
    pauseFrequency: number;
    rhythm: number;
  };
  quality: {
    clarity: number;
    consistency: number;
    naturalness: number;
  };
}

interface VoiceSimilarityMetrics {
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
}

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
  similarity?: VoiceSimilarityMetrics;
  characteristics?: VoiceCharacteristics;
}

interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  pitch: number;
  useSpeakerBoost: boolean;
}

interface VoiceStudioProps {
  persona: VoicePersona;
  onSave: (settings: VoiceSettings) => void;
  onClose: () => void;
}

export default function VoiceStudio({ persona, onSave, onClose }: VoiceStudioProps) {
  const [settings, setSettings] = useState<VoiceSettings>({
    stability: 0.75,
    similarityBoost: 0.85,
    style: 0.2,
    pitch: 0,
    useSpeakerBoost: true
  });
  
  const [testText, setTestText] = useState("Hello, this is a test of the voice clone. How does it sound?");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('controls');
  const [error, setError] = useState<string | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize similarity metrics
  const similarity: VoiceSimilarityMetrics = persona.similarity || {
    overall: 92,
    pitch: 94,
    tone: 89,
    accent: 96,
    pace: 88,
    clarity: 93,
    confidence: 91,
    details: {
      frequencyAnalysis: 95,
      formantMatching: 88,
      prosodyAlignment: 92,
      spectralSimilarity: 90
    }
  };

  // Initialize characteristics
  const characteristics: VoiceCharacteristics = persona.characteristics || {
    pitch: { average: 180, range: 50, variation: 0.3 },
    tone: { warmth: 0.7, brightness: 0.6, depth: 0.8 },
    pace: { wordsPerMinute: 145, pauseFrequency: 0.2, rhythm: 0.75 },
    quality: { clarity: 0.92, consistency: 0.88, naturalness: 0.9 }
  };

  const handleSettingChange = (key: keyof VoiceSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const generateSpeech = async (analyzeQuality = false) => {
    setIsGenerating(true);
    setError(null);
    if (analyzeQuality) {
      setIsAnalyzing(true);
    }
    
    try {
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          voiceId: persona.id,
          settings,
          analyzeQuality
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setError(null);

        // Extract quality metrics from headers if available
        if (analyzeQuality) {
          const qualityData = {
            overall: parseFloat(response.headers.get('X-Voice-Quality-Overall') || '0'),
            transcriptionAccuracy: parseFloat(response.headers.get('X-Voice-Quality-Transcription') || '0'),
            audioClarity: parseFloat(response.headers.get('X-Voice-Quality-Clarity') || '0'),
            naturalness: parseFloat(response.headers.get('X-Voice-Quality-Naturalness') || '0'),
            emotionalConsistency: parseFloat(response.headers.get('X-Voice-Quality-Emotional') || '0'),
            similarity: parseFloat(response.headers.get('X-Voice-Quality-Similarity') || '0.7'),
            technicalQuality: parseFloat(response.headers.get('X-Voice-Quality-Technical') || '0.75'),
            isProductionReady: response.headers.get('X-Voice-Quality-Production-Ready') === 'true',
            confidence: parseFloat(response.headers.get('X-Voice-Quality-Confidence') || '0'),
            recommendations: JSON.parse(response.headers.get('X-Voice-Quality-Recommendations') || '[]')
          };

          if (qualityData.overall > 0) {
            setQualityMetrics(qualityData);
            console.log('Voice quality analysis:', qualityData);
          }
        }
      } else {
        // Handle API errors
        const errorData = await response.json();
        setError(errorData.details || errorData.error || 'Voice generation failed');
        console.error('Voice generation failed:', errorData);
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
      setIsAnalyzing(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `${persona.name}_voice_test.wav`;
      a.click();
    }
  };

  const handleSave = () => {
    onSave(settings);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="text-4xl">{persona.avatar}</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{persona.name}</h1>
                <p className="text-gray-400">{persona.accent} • {persona.tone} • {persona.energy} Energy</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Similarity Badge */}
              <div className="px-3 py-2 bg-green-900/30 border border-green-600/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-green-400" />
                  <span className="text-green-300 font-medium">{similarity.overall}% Similarity</span>
                </div>
              </div>
              
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-400" />
                <span>Voice Controls</span>
              </h3>

              <div className="space-y-6">
                {/* Stability */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Stability</label>
                    <span className="text-xs text-purple-400">{Math.round(settings.stability * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.stability}
                    onChange={(e) => handleSettingChange('stability', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <p className="text-xs text-gray-500 mt-1">Controls voice consistency and stability</p>
                </div>

                {/* Similarity Boost */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Similarity Boost</label>
                    <span className="text-xs text-purple-400">{Math.round(settings.similarityBoost * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.similarityBoost}
                    onChange={(e) => handleSettingChange('similarityBoost', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enhances similarity to original voice</p>
                </div>

                {/* Style */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Style Exaggeration</label>
                    <span className="text-xs text-purple-400">{Math.round(settings.style * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.style}
                    onChange={(e) => handleSettingChange('style', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <p className="text-xs text-gray-500 mt-1">Controls emotional expressiveness</p>
                </div>

                {/* Pitch Adjustment */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Pitch Adjustment</label>
                    <span className="text-xs text-purple-400">{settings.pitch > 0 ? '+' : ''}{settings.pitch} semitones</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={settings.pitch}
                    onChange={(e) => handleSettingChange('pitch', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <p className="text-xs text-gray-500 mt-1">Adjusts voice pitch (±12 semitones)</p>
                </div>

                {/* Speaker Boost */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-300">Speaker Boost</span>
                    <p className="text-xs text-gray-500">Enhanced clarity and presence</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.useSpeakerBoost}
                    onChange={(e) => handleSettingChange('useSpeakerBoost', e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Panel */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6">
              {[
                { id: 'controls', label: 'Voice Testing', icon: Mic },
                { id: 'quality', label: 'Quality Dashboard', icon: Brain },
                { id: 'analytics', label: 'Voice Analytics', icon: BarChart3 },
                { id: 'waveform', label: 'Audio Analysis', icon: Waves }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'controls' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-6">Voice Testing</h3>
                
                <div className="space-y-6">
                  {/* Quick Test Buttons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Quick Voice Tests</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { 
                          label: "Quick Test", 
                          text: "Hello! This is a quick voice test. How do I sound?",
                          icon: "🎯"
                        },
                        { 
                          label: "Natural Speech", 
                          text: "I'm excited to show you how natural and expressive I can sound! Can you hear the enthusiasm in my voice?",
                          icon: "💬"
                        },
                        { 
                          label: "Professional", 
                          text: "Good morning. I'm pleased to assist you today. Thank you for your time and consideration.",
                          icon: "👔"
                        },
                        { 
                          label: "Conversational", 
                          text: "Hey there! So, what do you think about this voice? Pretty cool, right? I think it sounds quite natural!",
                          icon: "😊"
                        }
                      ].map((sample) => (
                        <button
                          key={sample.label}
                                                     onClick={async () => {
                             setTestText(sample.text);
                             setError(null);
                             // Auto-generate speech after setting text
                             setTimeout(async () => {
                               setIsGenerating(true);
                               try {
                                 const response = await fetch('/api/generate-speech', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({
                                     text: sample.text,
                                     voiceId: persona.id,
                                     settings
                                   }),
                                 });
                                 if (response.ok) {
                                   const blob = await response.blob();
                                   const url = URL.createObjectURL(blob);
                                   setAudioUrl(url);
                                   setError(null);
                                   // Auto-play the generated audio
                                   setTimeout(() => {
                                     if (audioRef.current) {
                                       audioRef.current.play();
                                       setIsPlaying(true);
                                     }
                                   }, 100);
                                 } else {
                                   const errorData = await response.json();
                                   setError(errorData.details || errorData.error || 'Voice generation failed');
                                 }
                               } catch (error) {
                                 console.error('Error generating speech:', error);
                                 setError('Network error. Please check your connection and try again.');
                               } finally {
                                 setIsGenerating(false);
                               }
                             }, 100);
                           }}
                          disabled={isGenerating}
                          className="flex items-center space-x-3 p-3 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 hover:border-purple-500/50 rounded-lg transition-all text-left disabled:opacity-50"
                        >
                          <span className="text-xl">{sample.icon}</span>
                          <span className="text-sm font-medium text-gray-300">{sample.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Custom Test Text</label>
                    <textarea
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      rows={4}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white resize-none"
                      placeholder="Enter your own text to test the voice..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{testText.length} characters</p>
                  </div>

                                    {/* Generate Button */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => generateSpeech(false)}
                      disabled={isGenerating || !testText.trim()}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 rounded-lg transition-colors text-white"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                      <span>{isGenerating ? 'Generating...' : 'Generate Voice'}</span>
                    </button>
                    
                    <button
                      onClick={async () => {
                        await generateSpeech(false);
                        // Auto-play immediately
                        setTimeout(() => {
                          if (audioRef.current) {
                            audioRef.current.play();
                            setIsPlaying(true);
                          }
                        }, 100);
                      }}
                      disabled={isGenerating || !testText.trim()}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 rounded-lg transition-colors text-white"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                      <span>{isGenerating ? 'Generating...' : 'Quick Listen'}</span>
                    </button>

                    <button
                      onClick={() => generateSpeech(true)}
                      disabled={isGenerating || !testText.trim()}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors text-white"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <BarChart3 className="h-5 w-5" />
                      )}
                      <span>{isAnalyzing ? 'Analyzing...' : 'Test Quality'}</span>
                    </button>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-400">⚠️</span>
                        <span className="text-sm font-medium text-red-300">Voice Generation Error</span>
                      </div>
                      <p className="text-xs text-red-200 mb-3">{error}</p>
                      
                      {/* Quick Fix Section */}
                      {error.includes('not properly configured') && (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 mb-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-blue-400">💡</span>
                            <span className="text-xs font-medium text-blue-300">Quick Fix Available</span>
                          </div>
                          <p className="text-xs text-blue-200 mb-2">
                            We found working voices you can use immediately:
                          </p>
                          <div className="space-y-1 mb-3">
                            {[
                              { id: 'k3kIfA1pkAv19MoNZBuC', name: 'Learning Voice (Recommended)' },
                              { id: 'JQl0mLpZBcM0W5amj3kp', name: 'Adaptive Voice A' },
                              { id: 'yo5lqkWhf4BslHQkOywe', name: 'Adaptive Voice B' },
                              { id: 'j1LdqViySiOjEAyxFq1W', name: 'Adaptive Voice C' }
                            ].map((voice, index) => (
                              <button
                                key={voice.id}
                                onClick={async () => {
                                  setError(null);
                                  setIsGenerating(true);
                                  try {
                                    const response = await fetch('/api/generate-speech', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        text: testText,
                                        voiceId: voice.id,
                                        settings
                                      }),
                                    });
                                    if (response.ok) {
                                      const blob = await response.blob();
                                      const url = URL.createObjectURL(blob);
                                      setAudioUrl(url);
                                      // Auto-play
                                      setTimeout(() => {
                                        if (audioRef.current) {
                                          audioRef.current.play();
                                          setIsPlaying(true);
                                        }
                                      }, 100);
                                    } else {
                                      const errorData = await response.json();
                                      setError(errorData.details || errorData.error || 'Voice generation failed');
                                    }
                                  } catch (error) {
                                    setError('Network error. Please check your connection and try again.');
                                  } finally {
                                    setIsGenerating(false);
                                  }
                                }}
                                className="flex items-center justify-between w-full text-left px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded text-xs transition-colors"
                              >
                                <span className="text-blue-300">{voice.name}</span>
                                <span className="text-blue-400 text-xs opacity-60">{voice.id.slice(0, 8)}...</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setError(null)}
                          className="text-xs px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-red-300 transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => {
                            setError(null);
                            generateSpeech(false);
                          }}
                          className="text-xs px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-blue-300 transition-colors"
                        >
                          Try Again
                        </button>
                        {error.includes('not properly configured') && (
                          <button
                            onClick={() => {
                              window.location.href = '/';
                            }}
                            className="text-xs px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-purple-300 transition-colors"
                          >
                            Choose Different Voice
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Audio Player */}
                  {audioUrl && (
                    <div className={`bg-gray-700/50 rounded-lg p-4 border-2 transition-all ${isPlaying ? 'border-green-500/50 bg-green-900/10' : 'border-gray-600'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={togglePlayback}
                            className={`p-3 rounded-full transition-all ${isPlaying ? 'bg-green-600 hover:bg-green-700 animate-pulse' : 'bg-purple-600 hover:bg-purple-700'}`}
                          >
                            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                          </button>
                          <div className="flex items-center space-x-2">
                            <Volume2 className={`h-5 w-5 ${isPlaying ? 'text-green-400' : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${isPlaying ? 'text-green-300' : 'text-gray-300'}`}>
                              {isPlaying ? '🎵 Playing Voice Test' : 'Voice Test Ready'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.currentTime = 0;
                                audioRef.current.play();
                                setIsPlaying(true);
                              }
                            }}
                            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
                          >
                            <Play className="h-4 w-4" />
                            <span>Replay</span>
                          </button>
                          <button
                            onClick={downloadAudio}
                            className="flex items-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors text-sm"
                          >
                            <Download className="h-4 w-4" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                      
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        className="w-full"
                        controls
                      />
                      
                      {isPlaying && (
                        <div className="mt-2 text-center">
                          <span className="text-xs text-green-400 animate-pulse">
                            🎧 Listen carefully to evaluate voice quality and naturalness
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Help Text */}
                  {!audioUrl && !error && (
                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-blue-400">💡</span>
                        <span className="text-sm font-medium text-blue-300">Quick Start Tips</span>
                      </div>
                      <ul className="text-xs text-blue-200 space-y-1">
                        <li>• Click any <strong>Quick Test</strong> button for instant voice preview</li>
                        <li>• Use <strong>Quick Listen</strong> to generate and auto-play your custom text</li>
                        <li>• Adjust voice controls on the left, then test to hear changes</li>
                        <li>• Perfect voice settings for production use</li>
                      </ul>
                    </div>
                  )}
                  
                  {/* Voice Status Indicator */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                    <span>Voice ID: {persona.id?.slice(0, 8)}...</span>
                    <div className="flex items-center space-x-1">
                      {error ? (
                        <>
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          <span className="text-red-400">Configuration Issue</span>
                        </>
                      ) : audioUrl ? (
                        <>
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-green-400">Audio Ready</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>Ready for testing</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'quality' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <VoiceQualityDashboard
                  qualityMetrics={qualityMetrics}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={() => generateSpeech(true)}
                />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-6">Voice Analytics</h3>
                
                {/* AI Quality Analysis */}
                {qualityMetrics && (
                  <div className="mb-6 bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                    <h4 className="font-semibold mb-4 text-blue-300 flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>AI Quality Analysis</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${qualityMetrics.overall >= 0.8 ? 'text-green-400' : qualityMetrics.overall >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Math.round(qualityMetrics.overall * 100)}%
                        </div>
                        <div className="text-xs text-gray-400">Overall</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${qualityMetrics.transcriptionAccuracy >= 0.85 ? 'text-green-400' : qualityMetrics.transcriptionAccuracy >= 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Math.round(qualityMetrics.transcriptionAccuracy * 100)}%
                        </div>
                        <div className="text-xs text-gray-400">Accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${qualityMetrics.audioClarity >= 0.75 ? 'text-green-400' : qualityMetrics.audioClarity >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Math.round(qualityMetrics.audioClarity * 100)}%
                        </div>
                        <div className="text-xs text-gray-400">Clarity</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${qualityMetrics.naturalness >= 0.75 ? 'text-green-400' : qualityMetrics.naturalness >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Math.round(qualityMetrics.naturalness * 100)}%
                        </div>
                        <div className="text-xs text-gray-400">Naturalness</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${qualityMetrics.isProductionReady ? 'bg-green-900/30 text-green-300 border border-green-600/30' : 'bg-yellow-900/30 text-yellow-300 border border-yellow-600/30'}`}>
                        {qualityMetrics.isProductionReady ? '✅ Production Ready' : '⚠️ Needs Improvement'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Confidence: {Math.round(qualityMetrics.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Similarity Metrics */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-4 text-green-300">Similarity Metrics</h4>
                    <div className="space-y-3">
                      {Object.entries({
                        'Overall': similarity.overall,
                        'Pitch Match': similarity.pitch,
                        'Tone Match': similarity.tone,
                        'Accent Match': similarity.accent,
                        'Pace Match': similarity.pace,
                        'Clarity': similarity.clarity
                      }).map(([label, value]) => (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">{label}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-600 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${value}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-green-400 w-8">{value}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Voice Characteristics */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-4 text-blue-300">Voice Characteristics</h4>
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm text-gray-300 block mb-2">Pitch Profile</span>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>Average: {characteristics.pitch.average}Hz</div>
                          <div>Range: {characteristics.pitch.range}Hz</div>
                          <div>Variation: {Math.round(characteristics.pitch.variation * 100)}%</div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm text-gray-300 block mb-2">Speaking Pace</span>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>WPM: {characteristics.pace.wordsPerMinute}</div>
                          <div>Pauses: {Math.round(characteristics.pace.pauseFrequency * 100)}%</div>
                          <div>Rhythm: {Math.round(characteristics.pace.rhythm * 100)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'waveform' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-6">Audio Analysis</h3>
                <div className="bg-gray-700/50 rounded-lg p-8 text-center">
                  <Waves className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Waveform analysis will appear here after voice generation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
} 