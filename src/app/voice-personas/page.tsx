'use client';

import { useState, useRef, useEffect } from 'react';
import { Navigation } from '@/components/shared/Navigation';
import { 
  Play, 
  Pause, 
  Upload, 
  Download, 
  Edit3, 
  Volume2, 
  FileText, 
  Mic, 
  Globe, 
  User, 
  Zap,
  Save,
  X,
  RefreshCw,
  Database,
  Wand2
} from 'lucide-react';
import { ttsService } from '@/lib/services/tts.service';
import { VoicePersona, GeneratedAudio } from '@/lib/types';
import { fileProcessors, downloadAudioFile, generateWaveform } from '@/lib/utils/audio';
import VoiceDesignModal from '@/components/voice-studio/VoiceDesignModal';

// Fallback voice persona data (in case API fails)
const fallbackVoicePersonas: VoicePersona[] = [
  {
    id: 'sarah-southern',
    name: 'Sarah Belle',
    region: 'Southern U.S.',
    accent: 'Georgia Southern',
    age: 28,
    tone: 'Warm & Friendly',
    energy: 'Medium',
    description: 'Charming Southern hospitality with a professional edge. Perfect for building rapport with clients.',
    avatar: '🌸',
    sampleText: "Well hello there! I'm so excited to share this amazing opportunity with y'all today.",
    voiceSettings: { pitch: 1.1, rate: 0.9, volume: 0.8 }
  },
  {
    id: 'james-british',
    name: 'James Windsor',
    region: 'British',
    accent: 'London RP',
    age: 35,
    tone: 'Sophisticated',
    energy: 'Low-Medium',
    description: 'Refined British accent that conveys authority and trustworthiness.',
    avatar: '🎩',
    sampleText: "Good afternoon, I trust you're having a splendid day. Shall we discuss this remarkable proposition?",
    voiceSettings: { pitch: 0.9, rate: 0.85, volume: 0.8 }
  },
  {
    id: 'olivia-aussie',
    name: 'Olivia Reef',
    region: 'Australian',
    accent: 'Sydney',
    age: 26,
    tone: 'Upbeat & Casual',
    energy: 'High',
    description: 'Energetic Australian charm that makes every conversation feel like catching up with a mate.',
    avatar: '🦘',
    sampleText: "G'day mate! This opportunity is absolutely bonkers good - you're gonna love what I've got for ya!",
    voiceSettings: { pitch: 1.2, rate: 1.1, volume: 0.9 }
  },
  {
    id: 'mike-midwest',
    name: 'Mike Heartland',
    region: 'Midwest U.S.',
    accent: 'Chicago',
    age: 42,
    tone: 'Straightforward',
    energy: 'Medium',
    description: 'No-nonsense Midwestern approach that builds trust through authenticity.',
    avatar: '🌾',
    sampleText: "Hey there, hope you're doing well. Let me cut right to the chase - this is something you need to hear.",
    voiceSettings: { pitch: 0.85, rate: 0.95, volume: 0.8 }
  },
  {
    id: 'elena-newyork',
    name: 'Elena Brooklyn',
    region: 'New York',
    accent: 'Brooklyn',
    age: 31,
    tone: 'Direct & Confident',
    energy: 'High',
    description: 'Fast-paced New York energy that gets straight to business.',
    avatar: '🗽',
    sampleText: "Listen, I don't have all day, but what I'm about to tell you is gonna change everything. You in?",
    voiceSettings: { pitch: 1.0, rate: 1.2, volume: 0.9 }
  },
  {
    id: 'carlos-westcoast',
    name: 'Carlos Malibu',
    region: 'West Coast',
    accent: 'California',
    age: 29,
    tone: 'Laid-back & Cool',
    energy: 'Medium',
    description: 'Relaxed California vibe that makes complex topics feel simple and approachable.',
    avatar: '🌴',
    sampleText: "Hey, what's up! So I've got this really cool opportunity that I think you're gonna vibe with.",
    voiceSettings: { pitch: 1.0, rate: 0.9, volume: 0.8 }
  },
  {
    id: 'rebecca-texas',
    name: 'Rebecca Lone Star',
    region: 'Texas',
    accent: 'Dallas',
    age: 33,
    tone: 'Bold & Persuasive',
    energy: 'High',
    description: 'Big Texas personality that commands attention and closes deals.',
    avatar: '🤠',
    sampleText: "Well howdy! Let me tell you something - this here opportunity is bigger than Texas itself!",
    voiceSettings: { pitch: 1.05, rate: 1.0, volume: 0.9 }
  },
  {
    id: 'alex-canadian',
    name: 'Alex Maple',
    region: 'Canadian',
    accent: 'Toronto',
    age: 30,
    tone: 'Polite & Professional',
    energy: 'Medium',
    description: 'Courteous Canadian approach that never pressures but always persuades.',
    avatar: '🍁',
    sampleText: "Hi there, eh! Sorry to bother you, but I've got something really exciting to share, if you don't mind.",
    voiceSettings: { pitch: 0.95, rate: 0.9, volume: 0.8 }
  }
];

export default function VoicePersonasPage() {
  const [voicePersonas, setVoicePersonas] = useState<VoicePersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<VoicePersona | null>(null);
  const [uploadedScript, setUploadedScript] = useState('');
  const [editedScript, setEditedScript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<GeneratedAudio | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [showVoiceDesignModal, setShowVoiceDesignModal] = useState(false);

  // Fetch voice personas from database
  const fetchVoicePersonas = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Voice Personas UI] Fetching personas from database...');
      
      const response = await fetch('/api/voice-personas');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch personas: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log(`[Voice Personas UI] Loaded ${data.count} personas from database`);
        setVoicePersonas(data.data);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to load personas');
      }
    } catch (error) {
      console.error('[Voice Personas UI] Error fetching personas:', error);
      setError(String(error));
      // Use fallback data if API fails
      console.log('[Voice Personas UI] Using fallback data');
      setVoicePersonas(fallbackVoicePersonas);
    } finally {
      setLoading(false);
    }
  };

  // Load personas on component mount
  useEffect(() => {
    fetchVoicePersonas();
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const processor = fileProcessors[extension as keyof typeof fileProcessors];
    
    if (processor) {
      try {
        const text = await processor(file);
        setUploadedScript(text);
        setEditedScript(text);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file. Please try again.');
      }
    } else {
      alert('Unsupported file format. Please upload .txt, .docx, or .pdf files.');
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const event = { target: { files } } as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(event);
    }
  };

  // Generate TTS audio
  const generateAudio = async () => {
    if (!selectedPersona || !editedScript.trim()) return;

    setIsGenerating(true);
    try {
      const result = await ttsService.synthesize(editedScript, selectedPersona.voiceSettings);
      setCurrentAudio(result);
      setDuration(result.duration);
      setWaveformData(generateWaveform());
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Error generating audio. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Play sample audio for persona
  const playSample = async (persona: VoicePersona) => {
    try {
      await ttsService.synthesizeWithBrowserTTS(persona.sampleText, persona.voiceSettings);
    } catch (error) {
      console.error('Error playing sample:', error);
    }
  };

  // Export audio
  const exportAudio = async (format: string) => {
    if (!currentAudio || !selectedPersona) return;

    try {
      const convertedAudio = await ttsService.convert(currentAudio.audioBlob, format);
      const filename = `sales-script-${selectedPersona.name.toLowerCase().replace(' ', '-')}`;
      downloadAudioFile(convertedAudio, filename, format);
    } catch (error) {
      console.error('Error exporting audio:', error);
      alert('Error exporting audio. Please try again.');
    }
  };

  // Toggle playback
  const togglePlayback = () => {
    if (!audioRef.current || !currentAudio) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current.src) {
        audioRef.current.src = currentAudio.url || '';
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Update playback time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setPlaybackTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentAudio]);

  return (
    <div className="flex min-h-screen bg-gray-900">
      <Navigation />
      
      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        <div className="px-4 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                  Voice Persona Studio
                </h1>
                <p className="text-gray-400 text-lg">Transform your sales scripts with personalized regional voices</p>
              </div>
              
              {/* Database Connection Status */}
              <div className="flex items-center gap-3">
                {loading ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                    <RefreshCw className="w-4 h-4 animate-spin text-yellow-400" />
                    <span className="text-sm text-yellow-400">Loading personas...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-600 rounded-lg">
                    <Database className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Using fallback data</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-600 rounded-lg">
                    <Database className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">{voicePersonas.length} personas loaded</span>
                  </div>
                )}
                
                <button
                  onClick={() => setShowVoiceDesignModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  title="Create custom voice from text description"
                >
                  <Wand2 className="w-4 h-4 text-white" />
                  <span className="text-sm text-white">Design Voice</span>
                </button>
                
                <button
                  onClick={fetchVoicePersonas}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-sm text-gray-300">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Voice Personas Panel */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-white">
                  <Globe className="w-6 h-6 text-blue-400" />
                  Voice Personas
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {voicePersonas.map((persona) => (
                    <div
                      key={persona.id}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                        selectedPersona?.id === persona.id
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedPersona(persona)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{persona.avatar}</span>
                          <div>
                            <h3 className="font-semibold text-lg text-white">{persona.name}</h3>
                            <p className="text-sm text-blue-400">{persona.region}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playSample(persona);
                          }}
                          className="p-2 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors"
                          aria-label={`Play sample for ${persona.name}`}
                        >
                          <Volume2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-3">{persona.description}</p>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-gray-600 rounded flex items-center gap-1 text-gray-300">
                          <User className="w-3 h-3" />
                          {persona.age}y
                        </span>
                        <span className="px-2 py-1 bg-gray-600 rounded flex items-center gap-1 text-gray-300">
                          <Mic className="w-3 h-3" />
                          {persona.tone}
                        </span>
                        <span className="px-2 py-1 bg-gray-600 rounded flex items-center gap-1 text-gray-300">
                          <Zap className="w-3 h-3" />
                          {persona.energy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="space-y-6">
              {/* Script Upload */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5 text-green-400" />
                  Sales Script
                </h3>
                
                {!uploadedScript ? (
                  <div
                    className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 mb-2">Drop your script here or click to browse</p>
                    <p className="text-sm text-gray-400">Supports .txt, .docx, .pdf</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.docx,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-400">✓ Script loaded</span>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm text-white"
                      >
                        {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        {isEditing ? 'Save' : 'Edit'}
                      </button>
                    </div>
                    
                    {isEditing ? (
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded resize-none focus:outline-none focus:border-blue-500 text-white"
                        placeholder="Edit your sales script..."
                      />
                    ) : (
                      <div className="p-3 bg-gray-700 rounded h-32 overflow-y-auto text-sm text-white">
                        {editedScript}
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        setUploadedScript('');
                        setEditedScript('');
                        setIsEditing(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-red-900 hover:bg-red-800 rounded transition-colors text-sm text-white"
                    >
                      <X className="w-4 h-4" />
                      Clear Script
                    </button>
                  </div>
                )}
              </div>

              {/* Audio Generation */}
              {selectedPersona && uploadedScript && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                    <Mic className="w-5 h-5 text-purple-400" />
                    Generate Audio
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-700 rounded">
                      <p className="text-sm text-gray-300">Selected Voice:</p>
                      <p className="font-semibold text-white">{selectedPersona.name} ({selectedPersona.region})</p>
                    </div>
                    
                    <button
                      onClick={generateAudio}
                      disabled={isGenerating}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 rounded-lg font-semibold transition-all duration-200 text-white"
                    >
                      {isGenerating ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Generating...
                        </div>
                      ) : (
                        'Generate Audio'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Audio Player */}
              {currentAudio && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                    <Volume2 className="w-5 h-5 text-orange-400" />
                    Audio Player
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Waveform Visualization */}
                    <div className="h-16 bg-gray-700 rounded flex items-end justify-center gap-1 p-2 overflow-hidden">
                      {waveformData.slice(0, 50).map((height, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-t from-purple-500 to-blue-400 w-1 transition-all duration-150"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{Math.floor(playbackTime)}s</span>
                      <span>{duration}s</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={togglePlayback}
                        className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full transition-all duration-200"
                      >
                        {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
                      </button>
                    </div>
                    
                    {/* Export Options */}
                    <div className="pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-400 mb-3">Export Audio:</p>
                      <div className="flex gap-2">
                        {['mp3', 'wav', 'ogg'].map((format) => (
                          <button
                            key={format}
                            onClick={() => exportAudio(format)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm text-white"
                          >
                            <Download className="w-4 h-4" />
                            .{format}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />

      {/* Voice Design Modal */}
      <VoiceDesignModal
        isOpen={showVoiceDesignModal}
        onClose={() => setShowVoiceDesignModal(false)}
        onVoiceCreated={(voiceId, name) => {
          console.log('New voice created:', name, voiceId);
          // Refresh personas to show the new voice
          fetchVoicePersonas();
          setShowVoiceDesignModal(false);
        }}
      />
    </div>
  );
} 