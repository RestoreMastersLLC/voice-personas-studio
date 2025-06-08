'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Play, 
  Star, 
  Clock, 
  MessageSquare, 
  CheckCircle2,
  Volume2,
  Scissors,
  Bot
} from 'lucide-react';

interface AudioSegment {
  start: number;
  end: number;
  text: string;
}

interface DetectedSpeaker {
  id: string;
  name: string;
  accent: string;
  quality_score: number;
  voice_characteristics: Record<string, string>;
  segments: AudioSegment[];
}

interface AnalysisResults {
  videoId: string;
  videoName: string;
  speakers: DetectedSpeaker[];
  totalSpeechDuration: number;
  backgroundNoiseLevel: string;
  qualityAssessment: string;
}

interface AnalysisResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: AnalysisResults;
  onCloneVoice: (speakerId: string, speakerName: string) => void;
  onCloneAllVoices: () => void;
  onExtractSegments: (speakerId: string, segments: number[]) => void;
  isCloning?: {[speakerId: string]: boolean};
  cloneSuccess?: {[speakerId: string]: boolean};
}

export function AnalysisResultsModal({ 
  isOpen, 
  onClose, 
  results, 
  onCloneVoice, 
  onCloneAllVoices,
  onExtractSegments,
  isCloning = {},
  cloneSuccess = {}
}: AnalysisResultsModalProps) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<{[speakerId: string]: number[]}>({});
  const [activeTab, setActiveTab] = useState<'current' | 'accumulated'>('current');
  const [accumulatedResults, setAccumulatedResults] = useState<AnalysisResults | null>(null);

  // Load accumulated results when modal opens
  useEffect(() => {
    if (isOpen && results.videoName) {
      fetchAccumulatedResults();
    }
  }, [isOpen, results.videoName]);

  const fetchAccumulatedResults = async () => {
    try {
      // Extract video URI from results or construct it
      const videoUri = `/videos/${results.videoId}`;
      const response = await fetch(`/api/video-analysis-results?videoUri=${encodeURIComponent(videoUri)}&accumulated=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAccumulatedResults({
            videoId: data.videoId,
            videoName: results.videoName,
            speakers: data.speakers,
            totalSpeechDuration: data.totalSpeechDuration,
            backgroundNoiseLevel: data.backgroundNoiseLevel,
            qualityAssessment: data.qualityAssessment
          });
        }
      }
    } catch (error) {
      console.error('Error fetching accumulated results:', error);
    }
  };

  if (!isOpen) return null;

  const currentResults = results;
  const displayResults = activeTab === 'current' ? currentResults : (accumulatedResults || currentResults);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSegmentSelection = (speakerId: string, segmentIndex: number) => {
    setSelectedSegments(prev => {
      const current = prev[speakerId] || [];
      const newSelection = current.includes(segmentIndex)
        ? current.filter(i => i !== segmentIndex)
        : [...current, segmentIndex];
      return { ...prev, [speakerId]: newSelection };
    });
  };

  const getQualityColor = (score: number) => {
    if (score >= 9) return 'text-green-400';
    if (score >= 7) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    return 'Fair';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
            <p className="text-gray-400 mt-1">{results.videoName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-700 flex-shrink-0">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'current'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Latest Analysis ({results.speakers.length} speakers)
            </button>
            <button
              onClick={() => setActiveTab('accumulated')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'accumulated'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              All Detected Voices ({accumulatedResults?.speakers.length || '...'} voices)
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="p-6 border-b border-gray-700 bg-gray-750 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Speakers Detected</span>
              </div>
                             <div className="text-2xl font-bold text-white">{displayResults.speakers.length}</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">Speech Duration</span>
              </div>
                             <div className="text-2xl font-bold text-white">{formatDuration(displayResults.totalSpeechDuration)}</div>
             </div>
             
             <div className="bg-gray-800 rounded-lg p-4">
               <div className="flex items-center gap-2 mb-2">
                 <Volume2 className="w-5 h-5 text-purple-400" />
                 <span className="text-gray-400 text-sm">Audio Quality</span>
               </div>
               <div className="text-2xl font-bold text-white capitalize">{displayResults.qualityAssessment}</div>
             </div>
             
             <div className="bg-gray-800 rounded-lg p-4">
               <div className="flex items-center gap-2 mb-2">
                 <MessageSquare className="w-5 h-5 text-orange-400" />
                 <span className="text-gray-400 text-sm">Background Noise</span>
               </div>
               <div className="text-2xl font-bold text-white capitalize">{displayResults.backgroundNoiseLevel}</div>
            </div>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Speakers List */}
          <div className="p-6 space-y-6">
            {displayResults.speakers.map((speaker) => (
              <div key={speaker.id} className="bg-gray-750 rounded-lg border border-gray-600">
                {/* Speaker Header */}
                <div className="p-4 border-b border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white">{speaker.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{speaker.accent}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className={getQualityColor(speaker.quality_score)}>
                              {speaker.quality_score.toFixed(1)}/10 ({getQualityLabel(speaker.quality_score)})
                            </span>
                          </div>
                          <span>{speaker.segments.length} segments</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {cloneSuccess[speaker.id] ? (
                        <div className="flex items-center gap-2">
                          <div className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Voice Cloned
                          </div>
                          <button
                            onClick={() => window.open('/voice-management', '_blank')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <User className="w-4 h-4" />
                            Manage Persona
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onCloneVoice(speaker.id, speaker.name)}
                          disabled={isCloning[speaker.id]}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          {isCloning[speaker.id] ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Cloning...
                            </>
                          ) : (
                            <>
                              <Bot className="w-4 h-4" />
                              Clone Voice
                            </>
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedSpeaker(selectedSpeaker === speaker.id ? null : speaker.id)}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                      >
                        {selectedSpeaker === speaker.id ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                  </div>

                  {/* Voice Characteristics */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(speaker.voice_characteristics).map(([key, value]) => (
                      <div key={key} className="bg-gray-700 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400 capitalize mb-1">{key}</div>
                        <div className="text-sm font-medium text-white">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Speaker Details */}
                {selectedSpeaker === speaker.id && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-white">
                        Audio Segments ({speaker.segments.length})
                      </h4>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                          Selected: {selectedSegments[speaker.id]?.length || 0}
                        </span>
                        <button
                          onClick={() => onExtractSegments(speaker.id, selectedSegments[speaker.id] || [])}
                          disabled={!selectedSegments[speaker.id]?.length}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <Scissors className="w-3 h-3" />
                          Extract Selected
                        </button>
                      </div>
                    </div>

                    {/* Segments Grid */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {speaker.segments.map((segment, segIndex) => (
                        <div
                          key={segIndex}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedSegments[speaker.id]?.includes(segIndex)
                              ? 'border-purple-500 bg-purple-900/20'
                              : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                          }`}
                          onClick={() => toggleSegmentSelection(speaker.id, segIndex)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400">
                                {formatDuration(segment.start)} - {formatDuration(segment.end)}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({formatDuration(segment.end - segment.start)})
                              </span>
                              {selectedSegments[speaker.id]?.includes(segIndex) && (
                                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                              )}
                            </div>
                            
                            <button className="p-1 hover:bg-gray-600 rounded transition-colors">
                              <Play className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          
                          <p className="text-sm text-white">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Success Summary */}
          {Object.values(cloneSuccess).some(success => success) && (
            <div className="p-6 bg-green-900/10">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-400 mb-2">🎉 Voice Cloning Complete!</h3>
              <p className="text-gray-300 mb-4">
                Your voice personas are ready! You can now:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-800 rounded-lg p-3">
                  <h4 className="font-medium text-white mb-1">💬 Generate Speech</h4>
                  <p className="text-gray-400">Use your cloned voices to create AI-generated speech</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <h4 className="font-medium text-white mb-1">🎭 Manage Personas</h4>
                  <p className="text-gray-400">Customize voice settings, tone, and characteristics</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <h4 className="font-medium text-white mb-1">🔄 Voice Conversations</h4>
                  <p className="text-gray-400">Create multi-voice dialogues and conversations</p>
                </div>
              </div>
                          </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-700 bg-gray-750 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {activeTab === 'current' ? 'Latest analysis completed' : 'All detected voices'} • {displayResults.speakers.length} {activeTab === 'current' ? 'speakers' : 'voices'} ready for cloning
            </div>
            
            <div className="flex items-center gap-3">
              {Object.values(cloneSuccess).some(success => success) && (
                <button
                  onClick={() => window.open('/voice-management', '_blank')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Open Voice Manager
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Close
              </button>
              
              {!Object.values(cloneSuccess).some(success => success) && (
                <button
                  onClick={onCloneAllVoices}
                  disabled={Object.values(isCloning).some(loading => loading)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {Object.values(isCloning).some(loading => loading) ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Cloning Voices...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4" />
                      Clone All Voices
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