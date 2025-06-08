'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/shared/Navigation';
import { 
  Settings, 
  Save, 
  Key, 
  Globe, 
  Volume2, 
  Database, 
  Shield, 
  Bell, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { configManager } from '@/config/app';
import { vimeoService } from '@/lib/services/vimeo.service';
import { elevenLabsService } from '@/lib/services/elevenlabs.service';

interface ApiSettings {
  vimeoAccessToken: string;
  elevenLabsApiKey: string;
  defaultTTSModel: string;
  defaultStability: number;
  defaultSimilarity: number;
  defaultStyle: number;
}

interface UserPreferences {
  autoGenerateOnUpload: boolean;
  defaultVoicePersona: string;
  enableNotifications: boolean;
  enableAnalytics: boolean;
  autoSaveScripts: boolean;
  preferredAudioFormat: string;
}

interface SystemStatus {
  vimeo: 'connected' | 'disconnected' | 'error';
  elevenLabs: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  apiUsage: {
    vimeo: { requests: number; limit: number };
    elevenLabs: { characters: number; limit: number };
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'api' | 'preferences' | 'system' | 'security'>('api');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [connectionStatus, setConnectionStatus] = useState<SystemStatus>({
    vimeo: 'disconnected',
    elevenLabs: 'disconnected',
    lastSync: new Date().toISOString(),
    apiUsage: {
      vimeo: { requests: 45, limit: 1000 },
      elevenLabs: { characters: 45230, limit: 100000 }
    }
  });

  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    vimeoAccessToken: '',
    elevenLabsApiKey: '',
    defaultTTSModel: 'eleven_multilingual_v2',
    defaultStability: 0.75,
    defaultSimilarity: 0.75,
    defaultStyle: 0.3
  });

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    autoGenerateOnUpload: false,
    defaultVoicePersona: 'sarah-southern',
    enableNotifications: true,
    enableAnalytics: true,
    autoSaveScripts: true,
    preferredAudioFormat: 'mp3'
  });

  useEffect(() => {
    loadSettings();
    checkConnectionStatus();
  }, []);

  const loadSettings = () => {
    // Load from localStorage or config
    const savedApiSettings = localStorage.getItem('apiSettings');
    const savedUserPreferences = localStorage.getItem('userPreferences');

    if (savedApiSettings) {
      setApiSettings(JSON.parse(savedApiSettings));
    }

    if (savedUserPreferences) {
      setUserPreferences(JSON.parse(savedUserPreferences));
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage (in production, save to backend)
      localStorage.setItem('apiSettings', JSON.stringify(apiSettings));
      localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const [vimeoStatus, elevenLabsStatus] = await Promise.allSettled([
        vimeoService.validateConnection(),
        elevenLabsService.validateConnection()
      ]);

      setConnectionStatus(prev => ({
        ...prev,
        vimeo: vimeoStatus.status === 'fulfilled' && vimeoStatus.value ? 'connected' : 'disconnected',
        elevenLabs: elevenLabsStatus.status === 'fulfilled' && elevenLabsStatus.value ? 'connected' : 'disconnected',
        lastSync: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const testConnection = async (service: 'vimeo' | 'elevenLabs') => {
    try {
      let isConnected = false;
      
      if (service === 'vimeo') {
        isConnected = await vimeoService.validateConnection();
      } else {
        isConnected = await elevenLabsService.validateConnection();
      }

      setConnectionStatus(prev => ({
        ...prev,
        [service]: isConnected ? 'connected' : 'error'
      }));

      alert(`${service === 'vimeo' ? 'Vimeo' : 'ElevenLabs'} connection ${isConnected ? 'successful' : 'failed'}!`);
    } catch (error) {
      console.error(`Error testing ${service} connection:`, error);
      setConnectionStatus(prev => ({
        ...prev,
        [service]: 'error'
      }));
      alert(`${service === 'vimeo' ? 'Vimeo' : 'ElevenLabs'} connection failed!`);
    }
  };

  const TabButton = ({ id, label, icon: Icon, active, onClick }: {
    id: string;
    label: string;
    icon: any;
    active: boolean;
    onClick: (id: string) => void;
  }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-purple-600 text-white' 
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const StatusIndicator = ({ status }: { status: 'connected' | 'disconnected' | 'error' }) => {
    const colors = {
      connected: 'bg-green-400',
      disconnected: 'bg-gray-400',
      error: 'bg-red-400'
    };

    const labels = {
      connected: 'Connected',
      disconnected: 'Not Connected',
      error: 'Error'
    };

    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${colors[status]}`}></div>
        <span className="text-sm text-gray-300">{labels[status]}</span>
      </div>
    );
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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-gray-400 mt-1">Configure your Voice Personas Studio</p>
              </div>
              
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 rounded-lg font-semibold transition-all duration-200 text-white"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-4 mt-6">
              <TabButton 
                id="api" 
                label="API Settings" 
                icon={Key} 
                active={activeTab === 'api'}
                onClick={setActiveTab}
              />
              <TabButton 
                id="preferences" 
                label="Preferences" 
                icon={Settings} 
                active={activeTab === 'preferences'}
                onClick={setActiveTab}
              />
              <TabButton 
                id="system" 
                label="System Status" 
                icon={Database} 
                active={activeTab === 'system'}
                onClick={setActiveTab}
              />
              <TabButton 
                id="security" 
                label="Security" 
                icon={Shield} 
                active={activeTab === 'security'}
                onClick={setActiveTab}
              />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* API Settings Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">API Configuration</h2>
              
              {/* Vimeo Settings */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" />
                    Vimeo API
                  </h3>
                  <StatusIndicator status={connectionStatus.vimeo} />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Access Token</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showApiKeys.vimeo ? 'text' : 'password'}
                          value={apiSettings.vimeoAccessToken}
                          onChange={(e) => setApiSettings(prev => ({ ...prev, vimeoAccessToken: e.target.value }))}
                          placeholder="Enter your Vimeo access token"
                          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white pr-10"
                        />
                        <button
                          onClick={() => setShowApiKeys(prev => ({ ...prev, vimeo: !prev.vimeo }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showApiKeys.vimeo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={() => testConnection('vimeo')}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
                      >
                        Test
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Get your token from{' '}
                      <a href="https://developer.vimeo.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        Vimeo Developer Console
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* ElevenLabs Settings */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-purple-400" />
                    ElevenLabs API
                  </h3>
                  <StatusIndicator status={connectionStatus.elevenLabs} />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">API Key</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showApiKeys.elevenLabs ? 'text' : 'password'}
                          value={apiSettings.elevenLabsApiKey}
                          onChange={(e) => setApiSettings(prev => ({ ...prev, elevenLabsApiKey: e.target.value }))}
                          placeholder="Enter your ElevenLabs API key"
                          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white pr-10"
                        />
                        <button
                          onClick={() => setShowApiKeys(prev => ({ ...prev, elevenLabs: !prev.elevenLabs }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showApiKeys.elevenLabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={() => testConnection('elevenLabs')}
                        className="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white"
                      >
                        Test
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Get your key from{' '}
                      <a href="https://elevenlabs.io/app/settings" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                        ElevenLabs Settings
                      </a>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Default Model</label>
                    <select 
                      value={apiSettings.defaultTTSModel}
                      onChange={(e) => setApiSettings(prev => ({ ...prev, defaultTTSModel: e.target.value }))}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                    >
                      <option value="eleven_multilingual_v2">Multilingual v2 (Recommended)</option>
                      <option value="eleven_monolingual_v1">Monolingual v1</option>
                      <option value="eleven_multilingual_v1">Multilingual v1</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Stability: {apiSettings.defaultStability}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={apiSettings.defaultStability}
                        onChange={(e) => setApiSettings(prev => ({ ...prev, defaultStability: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Similarity: {apiSettings.defaultSimilarity}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={apiSettings.defaultSimilarity}
                        onChange={(e) => setApiSettings(prev => ({ ...prev, defaultSimilarity: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        Style: {apiSettings.defaultStyle}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={apiSettings.defaultStyle}
                        onChange={(e) => setApiSettings(prev => ({ ...prev, defaultStyle: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">User Preferences</h2>
              
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">General Settings</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-gray-300 font-medium">Auto-generate on script upload</label>
                      <p className="text-sm text-gray-500">Automatically generate audio when a script is uploaded</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userPreferences.autoGenerateOnUpload}
                      onChange={(e) => setUserPreferences(prev => ({ ...prev, autoGenerateOnUpload: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-gray-300 font-medium">Enable notifications</label>
                      <p className="text-sm text-gray-500">Receive notifications for completed processes</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userPreferences.enableNotifications}
                      onChange={(e) => setUserPreferences(prev => ({ ...prev, enableNotifications: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-gray-300 font-medium">Auto-save scripts</label>
                      <p className="text-sm text-gray-500">Automatically save script changes</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userPreferences.autoSaveScripts}
                      onChange={(e) => setUserPreferences(prev => ({ ...prev, autoSaveScripts: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-gray-300 font-medium">Enable analytics</label>
                      <p className="text-sm text-gray-500">Allow usage analytics for platform improvement</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={userPreferences.enableAnalytics}
                      onChange={(e) => setUserPreferences(prev => ({ ...prev, enableAnalytics: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Default voice persona</label>
                    <select 
                      value={userPreferences.defaultVoicePersona}
                      onChange={(e) => setUserPreferences(prev => ({ ...prev, defaultVoicePersona: e.target.value }))}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                    >
                      <option value="sarah-southern">Sarah Belle (Southern U.S.)</option>
                      <option value="james-british">James Windsor (British)</option>
                      <option value="olivia-aussie">Olivia Reef (Australian)</option>
                      <option value="mike-midwest">Mike Heartland (Midwest U.S.)</option>
                      <option value="elena-newyork">Elena Brooklyn (New York)</option>
                      <option value="carlos-westcoast">Carlos Malibu (West Coast)</option>
                      <option value="rebecca-texas">Rebecca Lone Star (Texas)</option>
                      <option value="alex-canadian">Alex Maple (Canadian)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Preferred audio format</label>
                    <select 
                      value={userPreferences.preferredAudioFormat}
                      onChange={(e) => setUserPreferences(prev => ({ ...prev, preferredAudioFormat: e.target.value }))}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                    >
                      <option value="mp3">MP3 (Recommended)</option>
                      <option value="wav">WAV (High Quality)</option>
                      <option value="ogg">OGG (Compressed)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Status Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-white">System Status</h2>
                <button
                  onClick={checkConnectionStatus}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              
              {/* Service Status */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Service Connections</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="font-medium text-white">Vimeo API</div>
                        <div className="text-sm text-gray-400">Video library access</div>
                      </div>
                    </div>
                    <StatusIndicator status={connectionStatus.vimeo} />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="font-medium text-white">ElevenLabs API</div>
                        <div className="text-sm text-gray-400">Voice cloning and TTS</div>
                      </div>
                    </div>
                    <StatusIndicator status={connectionStatus.elevenLabs} />
                  </div>
                </div>
              </div>

              {/* API Usage */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">API Usage</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Vimeo Requests</span>
                      <span className="text-white">
                        {connectionStatus.apiUsage.vimeo.requests} / {connectionStatus.apiUsage.vimeo.limit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(connectionStatus.apiUsage.vimeo.requests / connectionStatus.apiUsage.vimeo.limit) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">ElevenLabs Characters</span>
                      <span className="text-white">
                        {connectionStatus.apiUsage.elevenLabs.characters.toLocaleString()} / {connectionStatus.apiUsage.elevenLabs.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(connectionStatus.apiUsage.elevenLabs.characters / connectionStatus.apiUsage.elevenLabs.limit) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment Info */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Environment Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-700 rounded">
                    <div className="text-sm text-gray-400">Environment</div>
                    <div className="font-medium text-white capitalize">{configManager.getEnvironment()}</div>
                  </div>
                  
                  <div className="p-3 bg-gray-700 rounded">
                    <div className="text-sm text-gray-400">Last Sync</div>
                    <div className="font-medium text-white">
                      {new Date(connectionStatus.lastSync).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">Security & Privacy</h2>
              
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Data Protection</h3>
                
                <div className="space-y-6">
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-400 mb-2">Data Encryption</h4>
                        <p className="text-sm text-blue-200">
                          All API keys and sensitive data are encrypted at rest and in transit using industry-standard encryption.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-400 mb-2">Local Storage</h4>
                        <p className="text-sm text-green-200">
                          Your settings and preferences are stored locally in your browser for enhanced privacy.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-400 mb-2">API Key Security</h4>
                        <ul className="text-sm text-yellow-200 space-y-1">
                          <li>• Never share your API keys publicly</li>
                          <li>• Regularly rotate your API keys</li>
                          <li>• Use environment variables in production</li>
                          <li>• Monitor API usage for suspicious activity</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Privacy Controls</h3>
                
                <div className="space-y-4">
                  <button className="w-full p-4 bg-red-900/20 border border-red-700 rounded-lg text-left hover:bg-red-900/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-red-400">Clear All Data</div>
                        <div className="text-sm text-red-200">Remove all locally stored settings and preferences</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-red-400" />
                    </div>
                  </button>
                  
                  <button className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-left hover:bg-gray-600 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Export Settings</div>
                        <div className="text-sm text-gray-400">Download your settings as a backup file</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 