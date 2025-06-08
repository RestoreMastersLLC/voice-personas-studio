// Core Types for Voice Personas Platform

export interface VoicePersona {
  id: string;
  name: string;
  region: string;
  accent: string;
  age: number;
  tone: string;
  energy: string;
  description: string;
  avatar: string;
  sampleText: string;
  voiceSettings: {
    pitch: number;
    rate: number;
    volume: number;
  };
}

export interface VimeoVideo {
  uri: string;
  name: string;
  description: string;
  duration: number;
  created_time: string;
  thumbnail: string;
  link: string;
  privacy: string;
  tags: string[];
  stats: {
    plays: number;
  };
  detected_speakers?: DetectedSpeaker[];
}

export interface DetectedSpeaker {
  id: string;
  name: string;
  accent: string;
  segments: AudioSegment[];
  quality_score: number;
  voice_characteristics: {
    pitch: string;
    tempo: string;
    emotion: string;
    clarity: string;
  };
}

export interface AudioSegment {
  start: number;
  end: number;
  text: string;
}

export interface ExtractedAudio {
  segments: ProcessedAudioSegment[];
  totalDuration: number;
  speaker: DetectedSpeaker;
  video: VimeoVideo;
}

export interface ProcessedAudioSegment extends AudioSegment {
  audioBlob: Blob;
  duration: number;
  quality: string;
  sampleRate: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: 'premade' | 'cloned';
  description: string;
  status?: string;
  source?: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style?: number;
  };
  sourceVideo?: VimeoVideo;
  sourceSpeaker?: DetectedSpeaker;
  extractedSegments?: number;
}

export interface VoiceCloneRequest {
  audioFile: File;
  voiceName: string;
  description: string;
}

export interface AudioQualityAnalysis {
  duration: number;
  quality: 'poor' | 'good' | 'excellent';
  sampleRate: string;
  recommendations: string[];
}

export interface UserInfo {
  subscription: string;
  character_count: number;
  character_limit: number;
  can_clone_voices: boolean;
  voice_limit: number;
  voice_count: number;
}

export interface GeneratedAudio {
  audioBlob: Blob;
  duration: number;
  format: string;
  url?: string;
}

export interface TTSRequest {
  text: string;
  voiceSettings: VoicePersona['voiceSettings'];
  voiceId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export type Environment = 'development' | 'production' | 'test';

export interface AppConfig {
  environment: Environment;
  api: {
    vimeo: {
      baseUrl: string;
      accessToken: string;
      clientId: string;
      clientSecret: string;
    };
    elevenLabs: {
      baseUrl: string;
      apiKey: string;
    };
  };
  audio: {
    maxDuration: number;
    supportedFormats: string[];
    qualityThreshold: number;
  };
} 