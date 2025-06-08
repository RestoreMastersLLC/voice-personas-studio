'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/shared/Navigation';
import VoiceDesignModal from '@/components/voice-studio/VoiceDesignModal';
import { 
  Wand2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Clock,
  Badge
} from 'lucide-react';

interface VoicePreview {
  voice_id: string;
  name: string;
  category: string;
}

interface SyncResult {
  success: boolean;
  synced: number;
  updated: number;
  skipped: number;
  errors: number;
  voices?: Array<{
    voice_id: string;
    name: string;
    status: 'synced' | 'updated' | 'skipped' | 'error';
    reason?: string;
  }>;
  error?: string;
}

export default function VoiceDesignPage() {
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [voicePreview, setVoicePreview] = useState<{
    total: number;
    existing: number;
    toSync: number;
    voices?: {
      existing: VoicePreview[];
      toSync: VoicePreview[];
    };
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Load voice preview on mount
  useEffect(() => {
    loadVoicePreview();
  }, []);

  const loadVoicePreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch('/api/sync-elevenlabs-voices');
      if (response.ok) {
        const data = await response.json();
        setVoicePreview(data);
      }
    } catch (error) {
      console.error('Failed to load voice preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSyncVoices = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/sync-elevenlabs-voices', {
        method: 'POST',
      });

      const data = await response.json();
      setSyncResult(data);

      if (data.success) {
        // Refresh the preview after successful sync
        await loadVoicePreview();
      }
    } catch (error) {
      setSyncResult({
        success: false,
        synced: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
        error: 'Network error occurred'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVoiceCreated = (voiceId: string, name: string) => {
    console.log('New voice created:', name, voiceId);
    // Refresh preview to show the new voice
    loadVoicePreview();
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <Navigation />
      
      <main className="flex-1 lg:ml-64 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Voice Design Studio</h1>
            <p className="text-gray-400">
              Create custom voices from text descriptions and sync your ElevenLabs library
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Voice Design Card */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-purple-900/20 rounded-lg">
                  <Wand2 className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">AI Voice Design</h2>
                  <p className="text-sm text-gray-400">Generate voices from descriptions</p>
                </div>
              </div>
              
              <p className="text-gray-300 mb-6">
                Describe the voice you want and let AI generate a custom voice that matches your specifications.
                Perfect for creating unique personas with specific characteristics.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Customizable gender, age, and accent
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Control voice style and characteristics
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Instant preview and testing
                </div>
              </div>

              <button
                onClick={() => setShowDesignModal(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Wand2 className="h-5 w-5" />
                <span>Create Custom Voice</span>
              </button>
            </div>

            {/* Voice Sync Card */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-blue-900/20 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">ElevenLabs Sync</h2>
                  <p className="text-sm text-gray-400">Import your voice library</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                Synchronize all voices from your ElevenLabs account to access them in Voice Personas.
                Includes premade voices, your clones, and professional voices.
              </p>

              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-400">Loading voice library...</span>
                </div>
              ) : voicePreview ? (
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total voices in ElevenLabs:</span>
                    <span className="font-medium text-white">{voicePreview.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Already synced:</span>
                    <span className="font-medium text-green-400">{voicePreview.existing}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Ready to sync:</span>
                    <span className="font-medium text-blue-400">{voicePreview.toSync}</span>
                  </div>
                </div>
              ) : null}

              <button
                onClick={handleSyncVoices}
                disabled={isSyncing || (voicePreview && voicePreview.toSync === 0)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Syncing Voices...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" />
                    <span>
                      {voicePreview && voicePreview.toSync === 0 
                        ? 'All Voices Synced' 
                        : 'Sync ElevenLabs Voices'
                      }
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync Results */}
          {syncResult && (
            <div className="mb-8">
              <div className={`rounded-xl p-6 border ${
                syncResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start space-x-3">
                  {syncResult.success ? (
                    <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className={`text-lg font-medium mb-2 ${
                      syncResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {syncResult.success ? 'Sync Completed!' : 'Sync Failed'}
                    </h3>
                    
                    {syncResult.success ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{syncResult.synced}</div>
                          <div className="text-sm text-green-700">Synced</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{syncResult.updated}</div>
                          <div className="text-sm text-blue-700">Updated</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">{syncResult.skipped}</div>
                          <div className="text-sm text-gray-700">Skipped</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{syncResult.errors}</div>
                          <div className="text-sm text-red-700">Errors</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-700">{syncResult.error}</p>
                    )}

                    {syncResult.voices && syncResult.voices.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-white mb-2">Voice Details:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {syncResult.voices.map((voice, index) => (
                            <div key={index} className="flex items-center justify-between text-sm bg-gray-800 bg-opacity-50 rounded px-3 py-2">
                              <span className="font-medium">{voice.name}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                voice.status === 'synced' ? 'bg-green-100 text-green-800' :
                                voice.status === 'updated' ? 'bg-blue-100 text-blue-800' :
                                voice.status === 'skipped' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {voice.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Voice Preview Lists */}
          {voicePreview && voicePreview.voices && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Voices to Sync */}
              {voicePreview.voices.toSync.length > 0 && (
                <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Clock className="h-5 w-5 text-blue-500 mr-2" />
                    Ready to Sync ({voicePreview.voices.toSync.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {voicePreview.voices.toSync.map((voice) => (
                      <div key={voice.voice_id} className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg">
                        <div>
                          <div className="font-medium text-white">{voice.name}</div>
                          <div className="text-sm text-gray-400">{voice.category}</div>
                        </div>
                        <Badge className="h-4 w-4 text-blue-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Voices */}
              {voicePreview.voices.existing.length > 0 && (
                <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Already Synced ({voicePreview.voices.existing.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {voicePreview.voices.existing.map((voice) => (
                      <div key={voice.voice_id} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
                        <div>
                          <div className="font-medium text-white">{voice.name}</div>
                          <div className="text-sm text-gray-400">{voice.category}</div>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Voice Design Modal */}
      <VoiceDesignModal
        isOpen={showDesignModal}
        onClose={() => setShowDesignModal(false)}
        onVoiceCreated={handleVoiceCreated}
      />
    </div>
  );
} 