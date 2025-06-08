'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/shared/Navigation';
import { 
  Search, 
  Play, 
  FileVideo, 
  User, 
  Star, 
  ExternalLink,
  Scissors,
  CheckCircle,
  RefreshCw,
  Bot,
  Mic,
  Loader2,
  CheckCircle2,
  XCircle,
  Users
} from 'lucide-react';
import { VimeoVideo, DetectedSpeaker } from '@/lib/types';
import { formatDuration } from '@/lib/utils/audio';
import { getCurrentUserId } from '@/lib/config/dev-constants';
import { AnalysisResultsModal } from '@/components/modals/AnalysisResultsModal';

interface AnalysisStatus {
  [videoUri: string]: {
    isAnalyzing: boolean;
    isCloning: boolean;
    speakers: number;
    personas: number;
    error?: string;
  };
}

interface AnalysisResults {
  videoId: string;
  videoName: string;
  speakers: DetectedSpeaker[];
  totalSpeechDuration: number;
  backgroundNoiseLevel: string;
  qualityAssessment: string;
}

export default function VimeoHarvesterPage() {
  const [videos, setVideos] = useState<VimeoVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VimeoVideo | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<DetectedSpeaker | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAccent, setFilterAccent] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({});
  const [isCloning, setIsCloning] = useState<{[speakerId: string]: boolean}>({});
  const [cloneSuccess, setCloneSuccess] = useState<{[speakerId: string]: boolean}>({});
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{
    total: number;
    processed: number;
    currentVideo: string;
    voiceMatches: Array<{
      name: string;
      videoCount: number;
      similarity: number;
    }>;
  } | null>(null);
  const perPage = 12;

  // Reset to page 1 when search changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  // Load videos on mount and when search/page changes
  useEffect(() => {
    loadVideos();
  }, [searchQuery, currentPage]);

  const loadVideos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[Vimeo Harvester] Fetching videos from API...');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        ...(searchQuery && { query: searchQuery })
      });
      
      const response = await fetch(`/api/vimeo-videos?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`[Vimeo Harvester] Loaded ${result.data.length} videos from ${result.total} total`);
        setVideos(result.data);
        setTotalVideos(result.total);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to load videos');
      }
    } catch (error) {
      console.error('[Vimeo Harvester] Error loading videos:', error);
      setError(String(error));
      setVideos([]); // Clear videos on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalysisResults = async (videoUri: string, videoName: string) => {
    try {
      const response = await fetch(`/api/video-analysis-results?videoUri=${encodeURIComponent(videoUri)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalysisResults({
            videoId: data.videoId,
            videoName,
            speakers: data.speakers,
            totalSpeechDuration: data.totalSpeechDuration,
            backgroundNoiseLevel: data.backgroundNoiseLevel,
            qualityAssessment: data.qualityAssessment
          });
          setShowAnalysisModal(true);
        }
      }
    } catch (error) {
      console.error('Error fetching analysis results:', error);
    }
  };

  const handleCloneVoice = async (speakerId: string, speakerName: string) => {
    console.log(`Cloning voice for speaker: ${speakerName} (${speakerId})`);
    
    setIsCloning(prev => ({ ...prev, [speakerId]: true }));
    
    try {
      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speakerId,
          userId: getCurrentUserId()
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`Voice cloning completed for ${speakerName}`);
        setCloneSuccess(prev => ({ ...prev, [speakerId]: true }));
        
        // Update analysis results to show persona was created
        if (analysisResults) {
          setAnalysisResults(prev => prev ? {
            ...prev,
            speakers: prev.speakers.map(speaker => 
              speaker.id === speakerId 
                ? { ...speaker, isCloned: true, personaId: result.clonedVoice.personaId }
                : speaker
            )
          } : null);
        }

        // Refresh video list to show updated status
        setTimeout(() => {
          loadVideos();
        }, 1000);

      } else {
        throw new Error(result.error || 'Voice cloning failed');
      }
    } catch (error) {
      console.error('Error cloning voice:', error);
    } finally {
      setIsCloning(prev => ({ ...prev, [speakerId]: false }));
    }
  };

  const handleCloneAllVoices = async () => {
    if (!analysisResults) return;
    
    console.log(`Starting batch clone for ${analysisResults.speakers.length} speakers`);
    
    setShowAnalysisModal(false);
    
    // Extract video URI from analysis results
    const videoUri = `/videos/${analysisResults.videoId}`;
    
    // Use the existing batch clone functionality
    await batchCloneVoices({ 
      uri: videoUri, 
      name: analysisResults.videoName 
    } as VimeoVideo);
  };

  const handleExtractSegments = async (speakerId: string, segments: number[]) => {
    console.log(`Extracting ${segments.length} segments for speaker: ${speakerId}`);
    // TODO: Implement segment extraction
  };

  const analyzeVideo = async (video: VimeoVideo) => {
    const videoUri = video.uri;
    
    // Set analyzing status
    setAnalysisStatus(prev => ({
      ...prev,
      [videoUri]: {
        isAnalyzing: true,
        isCloning: false,
        speakers: 0,
        personas: 0
      }
    }));

    try {
      console.log(`[Vimeo Harvester] Starting analysis for video: ${video.name}`);
      
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video,
          userId: getCurrentUserId()
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[Vimeo Harvester] Analysis completed: ${result.speakersDetected} speakers detected`);
        
        // Update analysis status
        setAnalysisStatus(prev => ({
          ...prev,
          [videoUri]: {
            isAnalyzing: false,
            isCloning: false,
            speakers: result.speakersDetected,
            personas: 0
          }
        }));

        // Get detailed analysis results and show modal
        await fetchAnalysisResults(videoUri, video.name);

        // Refresh videos to show detected speakers
        setTimeout(() => {
          loadVideos();
        }, 1000);
      } else {
        throw new Error(result.details || 'Analysis failed');
      }
    } catch (error) {
      console.error('[Vimeo Harvester] Analysis error:', error);
      setAnalysisStatus(prev => ({
        ...prev,
        [videoUri]: {
          isAnalyzing: false,
          isCloning: false,
          speakers: 0,
          personas: 0,
          error: error instanceof Error ? error.message : 'Analysis failed'
        }
      }));
    }
  };

  const batchCloneVoices = async (video: VimeoVideo) => {
    const videoUri = video.uri;
    
    // Set cloning status
    setAnalysisStatus(prev => ({
      ...prev,
      [videoUri]: {
        ...prev[videoUri],
        isCloning: true
      }
    }));

    try {
      console.log(`[Vimeo Harvester] Starting batch voice cloning for video: ${video.name}`);
      
      const response = await fetch('/api/batch-clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUri,
          userId: getCurrentUserId()
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[Vimeo Harvester] Batch cloning completed: ${result.successfulClones} personas created`);
        
        // Update analysis status
        setAnalysisStatus(prev => ({
          ...prev,
          [videoUri]: {
            ...prev[videoUri],
            isCloning: false,
            personas: result.successfulClones
          }
        }));

        // Refresh videos and voice personas
        setTimeout(() => {
          loadVideos();
        }, 1000);
      } else {
        throw new Error(result.details || 'Voice cloning failed');
      }
    } catch (error) {
      console.error('[Vimeo Harvester] Cloning error:', error);
      setAnalysisStatus(prev => ({
        ...prev,
        [videoUri]: {
          ...prev[videoUri],
          isCloning: false,
          error: error instanceof Error ? error.message : 'Voice cloning failed'
        }
      }));
    }
  };

  const getVideoAnalysisStatus = (videoUri: string) => {
    return analysisStatus[videoUri] || {
      isAnalyzing: false,
      isCloning: false,
      speakers: 0,
      personas: 0
    };
  };

  const runBatchAnalysis = async () => {
    setIsBatchAnalyzing(true);
    setBatchStatus({
      total: 0,
      processed: 0,
      currentVideo: 'Initializing...',
      voiceMatches: []
    });

    try {
      console.log('[Vimeo Harvester] Starting batch voice fingerprinting analysis...');
      
      const response = await fetch('/api/batch-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxVideos: 20,
          force: false
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[Vimeo Harvester] Batch analysis completed successfully');
        
        // Update final status
        setBatchStatus({
          total: result.summary.totalVideos,
          processed: result.summary.processed,
          currentVideo: 'Analysis Complete',
          voiceMatches: result.progress.voiceMatches || []
        });

        // Refresh videos to show updated analysis
        setTimeout(() => {
          loadVideos();
        }, 2000);

        // Show success notification
        console.log(`Batch Analysis Results:
          - Videos Processed: ${result.summary.processed}
          - Speakers Detected: ${result.summary.totalSpeakers}
          - Cross-Video Matches: ${result.summary.voiceMatches}
          - Voice Tracking: ${result.voiceTrackingSummary?.crossVideoMatches || 0} unique voice patterns`);

      } else {
        throw new Error(result.error || 'Batch analysis failed');
      }
    } catch (error) {
      console.error('[Vimeo Harvester] Batch analysis error:', error);
      setBatchStatus(prev => prev ? {
        ...prev,
        currentVideo: `Error: ${error instanceof Error ? error.message : 'Analysis failed'}`
      } : null);
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const toggleSegmentSelection = (segmentIndex: number) => {
    setSelectedSegments(prev => {
      if (prev.includes(segmentIndex)) {
        return prev.filter(index => index !== segmentIndex);
      } else {
        return [...prev, segmentIndex];
      }
    });
  };

  const uniqueAccents = [...new Set(videos.flatMap(v => 
    v.detected_speakers?.map(s => s.accent) || []
  ))];

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
                <h1 className="text-3xl font-bold text-white mb-2">
                  Vimeo Voice Harvester
                </h1>
                <p className="text-gray-400 text-lg">
                  Discover and extract voices from your Vimeo video library
                </p>
              </div>
              
              {/* Status Indicator */}
              <div className="text-right">
                {error ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-600 rounded-lg">
                    <span className="text-sm text-red-400">Connection Error</span>
                  </div>
                ) : totalVideos > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-600 rounded-lg">
                    <FileVideo className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">{totalVideos} videos found</span>
                  </div>
                ) : null}
                
                <button
                  onClick={loadVideos}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors mt-2 text-white disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Batch Analysis Section */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-700/30 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  Voice Fingerprinting Batch Analysis
                </h2>
                <p className="text-purple-200 text-sm">
                  Analyze all videos to track which voices appear across multiple videos using advanced fingerprinting
                </p>
              </div>
              <button
                onClick={runBatchAnalysis}
                disabled={isBatchAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 rounded-lg transition-colors text-white"
              >
                {isBatchAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                {isBatchAnalyzing ? 'Analyzing...' : 'Start Batch Analysis'}
              </button>
            </div>
            
            {batchStatus && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Analysis Progress</span>
                  <span className="text-purple-300 text-sm">
                    {batchStatus.processed}/{batchStatus.total} videos
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(batchStatus.processed / batchStatus.total) * 100}%` }}
                  ></div>
                </div>
                {batchStatus.currentVideo && (
                  <p className="text-gray-300 text-sm">
                    Processing: {batchStatus.currentVideo}
                  </p>
                )}
                {batchStatus.voiceMatches.length > 0 && (
                  <div className="mt-3">
                    <p className="text-green-400 text-sm font-medium mb-2">
                      🎯 Cross-Video Voice Matches Found: {batchStatus.voiceMatches.length}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {batchStatus.voiceMatches.slice(0, 4).map((match, idx) => (
                        <div key={idx} className="bg-gray-700/50 rounded p-2">
                          <p className="text-white text-sm font-medium">{match.name}</p>
                          <p className="text-gray-400 text-xs">
                            {match.videoCount} videos • {match.similarity}% similarity
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search videos by name, tags, or content..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                  />
                </div>
              </div>
              
              <div>
                <select
                  value={filterAccent}
                  onChange={(e) => setFilterAccent(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-white"
                >
                  <option value="all">All Accents</option>
                  {uniqueAccents.map(accent => (
                    <option key={accent} value={accent}>{accent}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
              <p className="text-red-400">
                <strong>Error loading videos:</strong> {error}
              </p>
              <p className="text-red-300 text-sm mt-2">
                Please check your internet connection and try refreshing.
              </p>
            </div>
          )}

          {/* Video Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="bg-gray-800 rounded-xl border border-gray-700 p-6 animate-pulse">
                  <div className="w-full h-32 bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))
            ) : (
              videos.map((video) => (
                <div
                  key={video.uri}
                  className={`bg-gray-800 rounded-xl border-2 p-6 transition-all duration-200 cursor-pointer hover:scale-105 ${
                    selectedVideo?.uri === video.uri
                      ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedVideo(video)}
                >
                  {/* Video Thumbnail */}
                  <div className="relative mb-4">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.name}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-32 bg-gray-700 rounded-lg flex items-center justify-center ${video.thumbnail ? 'hidden' : ''}`}>
                      <FileVideo className="w-8 h-8 text-gray-500" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                      {formatDuration(video.duration)}
                    </div>
                    <a
                      href={video.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 p-1 bg-black/70 rounded hover:bg-black/90 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4 text-white" />
                    </a>
                  </div>

                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-white">{video.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{video.description}</p>

                  {/* Analysis Status */}
                  {(() => {
                    const status = getVideoAnalysisStatus(video.uri);
                    
                    if (status.isAnalyzing) {
                      return (
                        <div className="flex items-center space-x-2 p-3 bg-blue-900/20 border border-blue-600 rounded-lg mb-4">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                          <span className="text-sm text-blue-400">Analyzing speakers...</span>
                        </div>
                      );
                    }
                    
                    if (status.isCloning) {
                      return (
                        <div className="flex items-center space-x-2 p-3 bg-purple-900/20 border border-purple-600 rounded-lg mb-4">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                          <span className="text-sm text-purple-400">Cloning voices...</span>
                        </div>
                      );
                    }

                    if (status.error) {
                      return (
                        <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-600 rounded-lg mb-4">
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-red-400">Error: {status.error}</span>
                        </div>
                      );
                    }

                    if (status.speakers > 0) {
                      return (
                        <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-600 rounded-lg mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span className="text-sm text-green-400">{status.speakers} speakers</span>
                            </div>
                            {status.personas > 0 && (
                              <div className="flex items-center space-x-1">
                                <Bot className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-purple-400">{status.personas} personas</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {/* Speaker Info */}
                  {video.detected_speakers && video.detected_speakers.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {video.detected_speakers.map((speaker) => (
                        <div key={speaker.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">{speaker.name}</span>
                            <span className="text-xs text-gray-400">({speaker.accent})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-white">{speaker.quality_score}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(() => {
                    const status = getVideoAnalysisStatus(video.uri);
                    
                    if (status.isAnalyzing || status.isCloning) {
                      return (
                        <div className="flex space-x-2 mb-4">
                          <button 
                            disabled 
                            className="flex-1 px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed text-sm"
                          >
                            Processing...
                          </button>
                        </div>
                      );
                    }

                    if (status.speakers > 0 && status.personas === 0) {
                      return (
                        <div className="flex space-x-2 mb-4">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              batchCloneVoices(video);
                            }}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center justify-center space-x-2"
                          >
                            <Mic className="w-4 h-4" />
                            <span>Clone Voices</span>
                          </button>
                        </div>
                      );
                    }

                    if (status.speakers > 0 && status.personas > 0) {
                      return (
                        <div className="flex space-x-2 mb-4">
                          <button 
                            disabled
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center justify-center space-x-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Complete</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="flex space-x-2 mb-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            analyzeVideo(video);
                          }}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center space-x-2"
                        >
                          <Users className="w-4 h-4" />
                          <span>Analyze Speakers</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {video.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalVideos > perPage && !isLoading && (
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
              >
                Previous
              </button>
              
              <span className="text-gray-400">
                Page {currentPage} of {Math.ceil(totalVideos / perPage)} 
                <span className="text-gray-500 ml-2">({totalVideos} total videos)</span>
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalVideos / perPage), currentPage + 1))}
                disabled={currentPage >= Math.ceil(totalVideos / perPage)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
              >
                Next
              </button>
            </div>
          )}

          {/* Selected Video Details */}
          {selectedVideo && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Video Analysis: {selectedVideo.name}</h3>
                <button
                  onClick={loadVideos}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              
              {selectedVideo.detected_speakers?.map((speaker) => (
                <div key={speaker.id} className="mb-6 p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg text-white">{speaker.name}</h4>
                      <p className="text-gray-400">{speaker.accent} • Quality: {speaker.quality_score}/10</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSpeaker(speaker);
                        setSelectedSegments([]);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white"
                    >
                      <Scissors className="w-4 h-4" />
                      Extract Voice
                    </button>
                  </div>

                  {/* Voice Characteristics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {Object.entries(speaker.voice_characteristics).map(([key, value]) => (
                      <div key={key} className="text-center p-2 bg-gray-600 rounded">
                        <div className="text-xs text-gray-400 capitalize">{key}</div>
                        <div className="text-sm font-medium text-white">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Speech Segments */}
                  {selectedSpeaker?.id === speaker.id && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-white">Select segments to extract ({selectedSegments.length} selected)</h5>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedSegments(speaker.segments.map((_, idx) => idx))}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => setSelectedSegments([])}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {speaker.segments.map((segment, idx) => {
                        const isSelected = selectedSegments.includes(idx);
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'border-purple-500 bg-purple-900/20'
                                : 'border-gray-600 bg-gray-600 hover:border-gray-500'
                            }`}
                            onClick={() => toggleSegmentSelection(idx)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-400'
                                }`}>
                                  {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm text-white">
                                  {formatDuration(segment.start)} - {formatDuration(segment.end)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ({segment.end - segment.start}s)
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Play segment
                                }}
                                className="p-2 hover:bg-gray-500 rounded"
                              >
                                <Play className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                            <p className="text-sm italic text-gray-300">&quot;{segment.text}&quot;</p>
                          </div>
                        );
                      })}

                      {selectedSegments.length > 0 && (
                        <div className="mt-4 text-center">
                          <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all duration-200 text-white">
                            Extract {selectedSegments.length} Segment{selectedSegments.length !== 1 ? 's' : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results Modal */}
      {showAnalysisModal && analysisResults && (
        <AnalysisResultsModal
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          results={analysisResults}
          onCloneVoice={handleCloneVoice}
          onCloneAllVoices={handleCloneAllVoices}
          onExtractSegments={handleExtractSegments}
          isCloning={isCloning}
          cloneSuccess={cloneSuccess}
        />
      )}
    </div>
  );
} 