'use client';

import { useState } from 'react';
import { X, Wand2, Play, Pause, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface VoiceDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCreated?: (voiceId: string, name: string) => void;
}

interface VoiceDesignSettings {
  prompt: string;
  gender: 'male' | 'female' | 'neutral';
  age: 'young' | 'middle_aged' | 'old';
  accent: 'american' | 'british' | 'australian' | 'irish';
  loudness: number;
  tempo: number;
  texture: number;
  style: number;
}

export default function VoiceDesignModal({ isOpen, onClose, onVoiceCreated }: VoiceDesignModalProps) {
  const [settings, setSettings] = useState<VoiceDesignSettings>({
    prompt: '',
    gender: 'neutral',
    age: 'middle_aged',
    accent: 'american',
    loudness: 0.5,
    tempo: 0.5,
    texture: 0.5,
    style: 0.5
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatedVoice, setGeneratedVoice] = useState<{voiceId: string; name: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!settings.prompt.trim()) {
      setError('Please describe the voice you want to create');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setGeneratedVoice(null);

    try {
      const response = await fetch('/api/voice-design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedVoice({ voiceId: result.voiceId, name: result.name });
        setAudioUrl(result.audioUrl);
        setSuccess(true);
        setError(null);
      } else {
        setError(result.error || 'Voice generation failed');
        if (result.warning) {
          setError(prev => `${prev}\n\n${result.warning}`);
        }
      }
         } catch {
       setError('Network error. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayAudio = () => {
    if (!audioUrl) return;

    if (isPlaying) {
      const audio = document.querySelector('audio') as HTMLAudioElement;
      if (audio) {
        audio.pause();
        setIsPlaying(false);
      }
    } else {
      const audio = new Audio(audioUrl);
      audio.play().then(() => {
        setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
      }).catch(() => {
        setError('Failed to play audio sample');
      });
    }
  };

  const handleUseVoice = () => {
    if (generatedVoice && onVoiceCreated) {
      onVoiceCreated(generatedVoice.voiceId, generatedVoice.name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Wand2 className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Voice Design</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Voice Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Description *
            </label>
            <textarea
              value={settings.prompt}
              onChange={(e) => setSettings(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Describe the voice you want to create... (e.g., 'A warm, professional female voice with a slight Southern accent that sounds confident and trustworthy')"
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about tone, accent, age, and personality traits
            </p>
          </div>

          {/* Voice Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={settings.gender}
                                 onChange={(e) => setSettings(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'neutral' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                disabled={isGenerating}
              >
                <option value="neutral">Neutral</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <select
                value={settings.age}
                                 onChange={(e) => setSettings(prev => ({ ...prev, age: e.target.value as 'young' | 'middle_aged' | 'old' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                disabled={isGenerating}
              >
                <option value="young">Young (20-30)</option>
                <option value="middle_aged">Middle Aged (30-50)</option>
                <option value="old">Older (50+)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Accent</label>
              <select
                value={settings.accent}
                                 onChange={(e) => setSettings(prev => ({ ...prev, accent: e.target.value as 'american' | 'british' | 'australian' | 'irish' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                disabled={isGenerating}
              >
                <option value="american">American</option>
                <option value="british">British</option>
                <option value="australian">Australian</option>
                <option value="irish">Irish</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style ({Math.round(settings.style * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.style}
                onChange={(e) => setSettings(prev => ({ ...prev, style: parseFloat(e.target.value) }))}
                className="w-full"
                disabled={isGenerating}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Conservative</span>
                <span>Expressive</span>
              </div>
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loudness ({Math.round(settings.loudness * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.loudness}
                onChange={(e) => setSettings(prev => ({ ...prev, loudness: parseFloat(e.target.value) }))}
                className="w-full"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tempo ({Math.round(settings.tempo * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.tempo}
                onChange={(e) => setSettings(prev => ({ ...prev, tempo: parseFloat(e.target.value) }))}
                className="w-full"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texture ({Math.round(settings.texture * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.texture}
                onChange={(e) => setSettings(prev => ({ ...prev, texture: parseFloat(e.target.value) }))}
                className="w-full"
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                  <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Display */}
          {success && generatedVoice && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-800">Voice Generated Successfully!</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Created voice: <strong>{generatedVoice.name}</strong>
                  </p>
                  
                  {audioUrl && (
                    <div className="mt-3 flex items-center space-x-3">
                      <button
                        onClick={handlePlayAudio}
                        className="flex items-center space-x-2 px-3 py-1 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="text-sm">
                          {isPlaying ? 'Pause' : 'Play'} Sample
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {isGenerating ? 'Generating voice...' : 'Ready to create voice'}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              
              {success && generatedVoice ? (
                <button
                  onClick={handleUseVoice}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Use This Voice
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !settings.prompt.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span>Generate Voice</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 