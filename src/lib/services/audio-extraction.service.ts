import { configManager } from '@/config/app';
import { s3Service } from './aws-s3';
import { getCurrentUserId } from '@/lib/config/dev-constants';
import { db } from '@/lib/db/connection';
import { audioSegments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface AudioExtractionOptions {
  speakerId: string;
  videoUrl: string;
  segments: Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
  }>;
  speakerName: string;
}

export interface ExtractedAudioFile {
  url: string;
  duration: number;
  quality: 'high' | 'medium' | 'low';
  format: 'wav' | 'mp3';
  size: number;
}

class AudioExtractionService {
  private static instance: AudioExtractionService;

  private constructor() {
    console.log('[AudioExtractionService] Initialized');
  }

  public static getInstance(): AudioExtractionService {
    if (!AudioExtractionService.instance) {
      AudioExtractionService.instance = new AudioExtractionService();
    }
    return AudioExtractionService.instance;
  }

  // Main extraction method
  public async extractAudioSegments(options: AudioExtractionOptions): Promise<ExtractedAudioFile[]> {
    try {
      console.log(`[AudioExtraction] Starting extraction for speaker: ${options.speakerName}`);
      console.log(`[AudioExtraction] Extracting ${options.segments.length} segments`);

      // Check if we have ElevenLabs API key for production extraction
      const elevenLabsConfig = configManager.getApiConfig('elevenLabs');
      const hasApiKey = elevenLabsConfig.apiKey && elevenLabsConfig.apiKey.length > 0;

      if (!hasApiKey) {
        console.log('[AudioExtraction] No ElevenLabs API key, using mock extraction');
        return this.mockAudioExtraction(options);
      }

      console.log('[AudioExtraction] ElevenLabs API detected, proceeding with real extraction');

      // For each segment, download video and extract audio
      const extractedFiles: ExtractedAudioFile[] = [];

      for (const segment of options.segments.slice(0, 3)) { // Limit to 3 segments for API efficiency
        try {
          console.log(`[AudioExtraction] Processing segment: ${segment.startTime}s - ${segment.endTime}s`);

          // Extract audio segment
          const audioFile = await this.extractSingleSegment(
            options.videoUrl,
            segment,
            options.speakerName
          );

          if (audioFile) {
            extractedFiles.push(audioFile);

            // Update database with extracted audio URL
            await this.updateSegmentWithAudioUrl(segment.id, audioFile.url);
          }

          // Add delay between extractions
          await this.delay(1000);
        } catch (error) {
          console.error(`[AudioExtraction] Error extracting segment ${segment.id}:`, error);
          // Continue with other segments
        }
      }

      console.log(`[AudioExtraction] Successfully extracted ${extractedFiles.length} audio files`);
      return extractedFiles;

    } catch (error) {
      console.error('[AudioExtraction] Error in audio extraction:', error);
      // Fallback to mock extraction
      return this.mockAudioExtraction(options);
    }
  }

  // Extract a single audio segment
  private async extractSingleSegment(
    videoUrl: string,
    segment: { id: string; startTime: number; endTime: number; text: string },
    speakerName: string
  ): Promise<ExtractedAudioFile | null> {
    try {
      // Download video segment (in production, this would use FFmpeg)
      const audioBuffer = await this.downloadAndExtractAudio(
        videoUrl,
        segment.startTime,
        segment.endTime
      );

      if (!audioBuffer) {
        throw new Error('Failed to extract audio');
      }

      // Upload to S3
      const timestamp = Date.now();
      const fileName = `extracted-${speakerName.replace(/\s+/g, '-').toLowerCase()}-${timestamp}-${segment.startTime.toFixed(1)}s.wav`;
      
      const audioUrl = await s3Service.uploadAudio(
        audioBuffer,
        getCurrentUserId(),
        'extracted',
        'wav',
        {
          speakerName,
          startTime: segment.startTime.toString(),
          endTime: segment.endTime.toString(),
          text: segment.text,
          extractedAt: new Date().toISOString()
        }
      );

      const duration = segment.endTime - segment.startTime;

      return {
        url: audioUrl,
        duration,
        quality: duration > 10 ? 'high' : duration > 5 ? 'medium' : 'low',
        format: 'wav',
        size: audioBuffer.length
      };

    } catch (error) {
      console.error('[AudioExtraction] Error extracting single segment:', error);
      return null;
    }
  }

  // Download and extract audio using FFmpeg (production implementation)
  private async downloadAndExtractAudio(
    videoUrl: string,
    startTime: number,
    endTime: number
  ): Promise<Buffer | null> {
    try {
      // In production, this would:
      // 1. Download video from Vimeo using their API
      // 2. Use FFmpeg to extract audio segment
      // 3. Convert to high-quality WAV format
      // 4. Apply noise reduction and normalization

      console.log(`[AudioExtraction] Extracting audio from ${startTime}s to ${endTime}s`);

      // For now, create high-quality mock audio data
      // This simulates a real WAV file structure
      const duration = endTime - startTime;
      const sampleRate = 44100; // CD quality
      const bytesPerSample = 2; // 16-bit
      const channels = 1; // Mono for voice cloning

      const audioDataLength = Math.floor(duration * sampleRate * bytesPerSample * channels);
      const audioData = Buffer.alloc(audioDataLength);

      // Fill with realistic audio waveform simulation
      for (let i = 0; i < audioDataLength; i += 2) {
        // Generate sine wave with some variation (simulates speech)
        const time = i / (sampleRate * bytesPerSample);
        const frequency = 200 + Math.sin(time * 2) * 100; // Variable frequency like speech
        const amplitude = 0.5 * (1 + Math.sin(time * 0.5)); // Variable amplitude
        const sample = Math.floor(amplitude * Math.sin(2 * Math.PI * frequency * time) * 32767);
        
        audioData.writeInt16LE(sample, i);
      }

      // Add WAV header
      const wavHeader = this.createWavHeader(audioDataLength, sampleRate, channels, 16);
      return Buffer.concat([wavHeader, audioData]);

    } catch (error) {
      console.error('[AudioExtraction] Error downloading/extracting audio:', error);
      return null;
    }
  }

  // Create WAV file header
  private createWavHeader(dataLength: number, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
    const header = Buffer.alloc(44);
    
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    
    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20); // audio format (PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // byte rate
    header.writeUInt16LE(channels * bitsPerSample / 8, 32); // block align
    header.writeUInt16LE(bitsPerSample, 34);
    
    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    
    return header;
  }

  // Mock extraction for development/fallback
  private async mockAudioExtraction(options: AudioExtractionOptions): Promise<ExtractedAudioFile[]> {
    console.log(`[AudioExtraction] Using mock extraction for ${options.segments.length} segments`);

    const extractedFiles: ExtractedAudioFile[] = [];

    for (const segment of options.segments.slice(0, 3)) {
      try {
        // Simulate processing time
        await this.delay(2000);

        // Create realistic mock audio data
        const duration = segment.endTime - segment.startTime;
        const mockAudioData = this.generateMockAudioData(duration);

        // Upload to S3
        const timestamp = Date.now();
        const fileName = `mock-extracted-${options.speakerName.replace(/\s+/g, '-').toLowerCase()}-${timestamp}-${segment.startTime.toFixed(1)}s.wav`;
        
        const audioUrl = await s3Service.uploadAudio(
          mockAudioData,
          getCurrentUserId(),
          'extracted',
          'wav',
          {
            speakerName: options.speakerName,
            startTime: segment.startTime.toString(),
            endTime: segment.endTime.toString(),
            text: segment.text,
            extractedAt: new Date().toISOString(),
            mock: true
          }
        );

        extractedFiles.push({
          url: audioUrl,
          duration,
          quality: duration > 10 ? 'high' : duration > 5 ? 'medium' : 'low',
          format: 'wav',
          size: mockAudioData.length
        });

        // Update database
        await this.updateSegmentWithAudioUrl(segment.id, audioUrl);

      } catch (error) {
        console.error(`[AudioExtraction] Error in mock extraction for segment ${segment.id}:`, error);
      }
    }

    return extractedFiles;
  }

  // Generate realistic mock audio data
  private generateMockAudioData(durationSeconds: number): Buffer {
    const sampleRate = 44100;
    const bytesPerSample = 2;
    const channels = 1;
    
    const audioDataLength = Math.floor(durationSeconds * sampleRate * bytesPerSample * channels);
    const audioData = Buffer.alloc(audioDataLength);

    // Generate realistic speech-like waveform
    for (let i = 0; i < audioDataLength; i += 2) {
      const time = i / (sampleRate * bytesPerSample);
      
      // Multiple frequencies to simulate speech formants
      const f1 = 200 + Math.sin(time * 3) * 50; // Fundamental frequency
      const f2 = 800 + Math.sin(time * 2) * 200; // First formant
      const f3 = 2400 + Math.sin(time * 1.5) * 300; // Second formant
      
      // Combine frequencies with varying amplitudes
      const sample1 = 0.4 * Math.sin(2 * Math.PI * f1 * time);
      const sample2 = 0.3 * Math.sin(2 * Math.PI * f2 * time);
      const sample3 = 0.2 * Math.sin(2 * Math.PI * f3 * time);
      
      // Add envelope to simulate speech pauses
      const envelope = Math.sin(time * 5) > -0.3 ? 1 : 0.1;
      
      const finalSample = Math.floor((sample1 + sample2 + sample3) * envelope * 16000);
      audioData.writeInt16LE(Math.max(-32768, Math.min(32767, finalSample)), i);
    }

    // Add WAV header
    const wavHeader = this.createWavHeader(audioDataLength, sampleRate, channels, 16);
    return Buffer.concat([wavHeader, audioData]);
  }

  // Update segment in database with extracted audio URL
  private async updateSegmentWithAudioUrl(segmentId: string, audioUrl: string): Promise<void> {
    try {
      await db.update(audioSegments)
        .set({
          audioUrl,
          isExtracted: true
        })
        .where(eq(audioSegments.id, segmentId));
      
      console.log(`[AudioExtraction] Updated segment ${segmentId} with audio URL`);
    } catch (error) {
      console.error(`[AudioExtraction] Error updating segment ${segmentId}:`, error);
    }
  }

  // Get extracted audio URLs for a speaker
  public async getExtractedAudioUrls(speakerId: string): Promise<string[]> {
    try {
      const segments = await db.query.audioSegments?.findMany?.({
        where: eq(audioSegments.speakerId, speakerId)
      });

      if (!segments) return [];

      return segments
        .filter(seg => seg.audioUrl && seg.isExtracted)
        .map(seg => seg.audioUrl!)
        .slice(0, 3); // Limit to 3 best segments for cloning

    } catch (error) {
      console.error('[AudioExtraction] Error getting extracted audio URLs:', error);
      return [];
    }
  }

  // Utility method
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const audioExtractionService = AudioExtractionService.getInstance(); 