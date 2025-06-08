import { AudioQualityAnalysis } from '@/lib/types';

// File processing utilities
export const fileProcessors = {
  '.txt': (file: File) => file.text(),
  '.docx': async (file: File) => {
    // Mock DOCX processing - in real implementation use mammoth.js
    return "Mock extracted text from DOCX file: " + file.name;
  },
  '.pdf': async (file: File) => {
    // Mock PDF processing - in real implementation use PDF.js
    return "Mock extracted text from PDF file: " + file.name;
  }
};

// Audio format validation
export const isValidAudioFormat = (file: File): boolean => {
  const validFormats = ['audio/mp3', 'audio/wav', 'audio/flac', 'audio/ogg'];
  return validFormats.includes(file.type);
};

// Video format validation
export const isValidVideoFormat = (file: File): boolean => {
  const validFormats = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
  return validFormats.includes(file.type);
};

// Extract audio from video file (mock implementation)
export const extractAudioFromVideo = async (videoFile: File): Promise<File> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Mock extraction - return as WAV file
  return new File([videoFile], videoFile.name.replace(/\.[^/.]+$/, '.wav'), {
    type: 'audio/wav'
  });
};

// Validate audio quality for voice cloning
export const validateAudioQuality = (audioFile: File): AudioQualityAnalysis => {
  // Mock quality analysis based on file size and type
  const duration = Math.random() * 300 + 30; // 30s to 5min
  const quality = audioFile.size > 1000000 && isValidAudioFormat(audioFile) ? 'good' : 'poor';
  
  return {
    duration,
    quality,
    sampleRate: quality === 'good' ? '44.1kHz' : '22kHz',
    recommendations: quality === 'poor' ? 
      ['Use higher quality audio', 'Reduce background noise', 'Ensure clear speech'] : 
      ['Audio quality is excellent for cloning']
  };
};

// Convert blob to audio file
export const blobToAudioFile = (blob: Blob, filename: string, format: string): File => {
  return new File([blob], `${filename}.${format}`, { type: `audio/${format}` });
};

// Generate waveform data for visualization
export const generateWaveform = (length = 100): number[] => {
  return Array.from({ length }, () => Math.random() * 100);
};

// Format duration in seconds to MM:SS
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Create audio URL from blob for playback
export const createAudioUrl = (audioBlob: Blob): string => {
  return URL.createObjectURL(audioBlob);
};

// Cleanup audio URL to prevent memory leaks
export const cleanupAudioUrl = (url: string): void => {
  URL.revokeObjectURL(url);
};

// Download file utility
export const downloadAudioFile = (audioBlob: Blob, filename: string, format: string): void => {
  const url = createAudioUrl(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  cleanupAudioUrl(url);
};

// Combine multiple audio segments (mock implementation)
export const combineAudioSegments = async (segments: Blob[]): Promise<Blob> => {
  // Mock implementation - in production would use Web Audio API
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simple concatenation simulation
  return new Blob(segments, { type: 'audio/wav' });
};

// Audio compression utility
export const compressAudio = async (audioBlob: Blob, quality = 0.8): Promise<Blob> => {
  // Mock compression - in production would use audio processing libraries
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const compressedSize = Math.floor(audioBlob.size * quality);
  return new Blob([audioBlob.slice(0, compressedSize)], { type: audioBlob.type });
}; 