import { configManager } from '@/config/app';
import { DetectedSpeaker, AudioSegment, VimeoVideo } from '@/lib/types';
import { s3Service } from './aws-s3';
import { db } from '@/lib/db/connection';
import { vimeoVideos, detectedSpeakers, audioSegments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/config/dev-constants';
import { voiceFingerprintingService } from './voice-fingerprinting.service';

export interface SpeakerDetectionResult {
  videoId: string;
  speakers: DetectedSpeaker[];
  totalSpeechDuration: number;
  backgroundNoiseLevel: 'low' | 'medium' | 'high';
  qualityAssessment: 'poor' | 'good' | 'excellent';
}

export interface AudioExtractionRequest {
  videoUri: string;
  speakerId: string;
  segments: number[]; // segment indices to extract
}

class SpeakerDetectionService {
  private static instance: SpeakerDetectionService;

  private constructor() {
    console.log('[SpeakerDetectionService] Initialized');
  }

  public static getInstance(): SpeakerDetectionService {
    if (!SpeakerDetectionService.instance) {
      SpeakerDetectionService.instance = new SpeakerDetectionService();
    }
    return SpeakerDetectionService.instance;
  }

  // Analyze video for speaker detection
  public async analyzeVideo(video: VimeoVideo, userId: string): Promise<SpeakerDetectionResult> {
    try {
      console.log(`[SpeakerDetection] Starting analysis for video: ${video.name}`);

      // Store video in database first
      const videoRecord = await this.storeVideoRecord(video, userId);

      // Simulate AI speaker detection (in production, this would use actual AI services)
      if (configManager.isDevelopment()) {
        return this.simulateSpeakerDetection(video, videoRecord.id);
      }

      // Production implementation would integrate with:
      // - Azure Speech Services
      // - Google Cloud Speech-to-Text
      // - AWS Transcribe with speaker diarization
      // - Custom ML models for speaker identification
      
      throw new Error('Production speaker detection not yet implemented');
    } catch (error) {
      console.error(`[SpeakerDetection] Error analyzing video ${video.uri}:`, error);
      throw error;
    }
  }

  // Extract audio segments for voice cloning
  public async extractAudioSegments(request: AudioExtractionRequest): Promise<string[]> {
    try {
      console.log(`[SpeakerDetection] Extracting audio segments for ${request.speakerId}`);

      // Get speaker and segments from database
      const speaker = await db.query.detectedSpeakers?.findFirst?.({
        where: eq(detectedSpeakers.speakerId, request.speakerId),
        with: { audioSegments: true }
      });

      if (!speaker) {
        throw new Error(`Speaker not found: ${request.speakerId}`);
      }

      const extractedUrls: string[] = [];

      // Process each selected segment
      for (const segmentIndex of request.segments) {
        const segment = speaker.audioSegments?.[segmentIndex];
        if (!segment) continue;

        // In development, simulate audio extraction
        if (configManager.isDevelopment()) {
          const mockAudioUrl = await this.simulateAudioExtraction(
            request.videoUri, 
            segment,
            speaker.name || 'Unknown Speaker'
          );
          extractedUrls.push(mockAudioUrl);
        } else {
          // Production implementation would:
          // 1. Download video from Vimeo
          // 2. Extract audio segment using FFmpeg
          // 3. Apply audio enhancement/cleanup
          // 4. Upload to S3
          // 5. Store URL in database
          throw new Error('Production audio extraction not yet implemented');
        }
      }

      // Update extraction status
      await this.updateExtractionStatus(request.speakerId, extractedUrls);

      return extractedUrls;
    } catch (error) {
      console.error(`[SpeakerDetection] Error extracting audio:`, error);
      throw error;
    }
  }

  // Get detected speakers for a video
  public async getVideoSpeakers(videoUri: string): Promise<DetectedSpeaker[]> {
    try {
      const videoRecord = await db.query.vimeoVideos?.findFirst?.({
        where: eq(vimeoVideos.vimeoUri, videoUri),
        with: {
          detectedSpeakers: {
            with: { audioSegments: true }
          }
        }
      });

      if (!videoRecord?.detectedSpeakers) {
        return [];
      }

      return videoRecord.detectedSpeakers.map(speaker => ({
        id: speaker.speakerId,
        name: speaker.name || 'Unknown Speaker',
        accent: speaker.accent || 'Unknown',
        quality_score: Number(speaker.qualityScore) || 0,
                 voice_characteristics: (speaker.voiceCharacteristics as Record<string, string>) || {},
        segments: speaker.audioSegments?.map(seg => ({
          start: Number(seg.startTime),
          end: Number(seg.endTime),
          text: seg.text || ''
        })) || []
      }));
    } catch (error) {
      console.error(`[SpeakerDetection] Error getting speakers:`, error);
      return [];
    }
  }

  // Private methods

  private async storeVideoRecord(video: VimeoVideo, userId: string) {
    try {
      // Check if video already exists
      const existing = await db.query.vimeoVideos?.findFirst?.({
        where: eq(vimeoVideos.vimeoUri, video.uri)
      });

      if (existing) {
        return existing;
      }

      // Insert new video record
      const [videoRecord] = await db.insert(vimeoVideos).values({
        userId,
        vimeoUri: video.uri,
        name: video.name,
        description: video.description || '',
        duration: video.duration,
        thumbnail: video.thumbnail || '',
        link: typeof video.link === 'string' ? video.link : String(video.link || ''),
        privacy: video.privacy,
        tags: video.tags,
        stats: video.stats,
        analysisStatus: 'processing'
      }).returning();

      return videoRecord;
    } catch (error) {
      console.error('[SpeakerDetection] Error storing video record:', error);
      throw error;
    }
  }

  private async simulateSpeakerDetection(video: VimeoVideo, videoId: string): Promise<SpeakerDetectionResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate realistic speaker detection based on video content
    const speakers = await this.generateRealisticSpeakers(video);
    
    // Store speakers in database
    for (const speaker of speakers) {
      await this.storeSpeakerWithSegments(videoId, speaker);
    }

    // Update video analysis status
    await db.update(vimeoVideos)
      .set({
        analysisStatus: 'completed',
        speakersDetected: speakers.length,
        totalSpeechDuration: Math.round(speakers.reduce((total, s) => 
          total + s.segments.reduce((segTotal, seg) => segTotal + (seg.end - seg.start), 0), 0
        )),
        backgroundNoiseLevel: 'low',
        qualityAssessment: 'good'
      })
      .where(eq(vimeoVideos.id, videoId));

    return {
      videoId,
      speakers,
      totalSpeechDuration: speakers.reduce((total, s) => 
        total + s.segments.reduce((segTotal, seg) => segTotal + (seg.end - seg.start), 0), 0
      ),
      backgroundNoiseLevel: 'low',
      qualityAssessment: 'good'
    };
  }

  private async generateRealisticSpeakers(video: VimeoVideo): Promise<DetectedSpeaker[]> {
    const speakers: DetectedSpeaker[] = [];
    const duration = video.duration;

    // Analyze video name/description to generate appropriate speakers
    const videoName = video.name.toLowerCase();
    
    if (videoName.includes('training') || videoName.includes('course') || videoName.includes('hire')) {
      // Training videos typically have 1-2 speakers
      const accent1 = this.detectAccentFromContent(videoName);
      const qualityScore1 = Math.random() * 2 + 8; // 8.0-10.0 for training content
      const characteristics1 = {
        pitch: this.randomChoice(['Low', 'Medium-Low', 'Medium', 'Medium-High']),
        tempo: this.randomChoice(['Slow', 'Moderate', 'Fast']),
        emotion: this.randomChoice(['Professional', 'Confident', 'Instructional', 'Encouraging']),
        clarity: this.randomChoice(['Good', 'Excellent'])
      };

      speakers.push({
        id: `speaker_${Date.now()}_1`,
        name: await this.generateIntelligentSpeakerName(accent1, characteristics1, qualityScore1),
        accent: accent1,
        quality_score: qualityScore1,
        voice_characteristics: characteristics1,
        segments: this.generateRealisticSegments(duration, 0)
      });

      // Sometimes add a second speaker for Q&A or dialogue
      if (Math.random() > 0.6) {
        const characteristics2 = {
          pitch: this.randomChoice(['Medium', 'Medium-High', 'High']),
          tempo: this.randomChoice(['Moderate', 'Fast']),
          emotion: this.randomChoice(['Curious', 'Engaged', 'Questioning']),
          clarity: this.randomChoice(['Good', 'Excellent'])
        };
        const qualityScore2 = Math.random() * 1.5 + 7; // 7.0-8.5 for participants

        speakers.push({
          id: `speaker_${Date.now()}_2`,
          name: await this.generateIntelligentSpeakerName('General American', characteristics2, qualityScore2),
          accent: 'General American',
          quality_score: qualityScore2,
          voice_characteristics: characteristics2,
          segments: this.generateRealisticSegments(duration, 1)
        });
      }
    } else {
      // Other content types
      const accent = this.detectAccentFromContent(videoName);
      const qualityScore = Math.random() * 2 + 7.5; // 7.5-9.5
      const characteristics = {
        pitch: this.randomChoice(['Medium-Low', 'Medium', 'Medium-High']),
        tempo: this.randomChoice(['Moderate', 'Fast']),
        emotion: this.randomChoice(['Professional', 'Informative', 'Explanatory']),
        clarity: this.randomChoice(['Good', 'Excellent'])
      };

      speakers.push({
        id: `speaker_${Date.now()}_1`,
        name: await this.generateIntelligentSpeakerName(accent, characteristics, qualityScore),
        accent: accent,
        quality_score: qualityScore,
        voice_characteristics: characteristics,
        segments: this.generateRealisticSegments(duration, 0)
      });
    }

    return speakers;
  }

  private async generateIntelligentSpeakerName(
    accent: string, 
    characteristics: Record<string, string>, 
    qualityScore: number
  ): Promise<string> {
    try {
      // Use voice fingerprinting to find matches or generate intelligent names
      const voiceMatch = await voiceFingerprintingService.findVoiceMatch(
        accent,
        {
          pitch: characteristics.pitch || 'Medium',
          tempo: characteristics.tempo || 'Moderate', 
          emotion: characteristics.emotion || 'Professional',
          clarity: characteristics.clarity || 'Good'
        },
        qualityScore
      );

      if (voiceMatch.matched && voiceMatch.suggestedName) {
        console.log(`[SpeakerDetection] Voice match found! Using existing name: ${voiceMatch.suggestedName}`);
        return voiceMatch.suggestedName;
      }

      if (voiceMatch.suggestedName) {
        console.log(`[SpeakerDetection] Generated intelligent name: ${voiceMatch.suggestedName}`);
        return voiceMatch.suggestedName;
      }

      // Fallback to simple intelligent naming
      return this.generateFallbackName(accent, characteristics);
    } catch (error) {
      console.error('[SpeakerDetection] Error in intelligent naming:', error);
      return this.generateFallbackName(accent, characteristics);
    }
  }

  private generateFallbackName(accent: string, characteristics: Record<string, string>): string {
    const baseNames = {
      'General American': ['Alex', 'Jordan', 'Taylor'],
      'Southern U.S.': ['Avery', 'Blake', 'Carter'], 
      'West Coast': ['Riley', 'Quinn', 'Skyler'],
      'British RP': ['Charlie', 'Finley', 'Hadley'],
      'Australian': ['Harper', 'Blake', 'Riley']
    };

    const names = baseNames[accent] || baseNames['General American'];
    const baseName = this.randomChoice(names);
    
    // Add characteristic hint
    if (characteristics.emotion?.toLowerCase().includes('professional')) {
      return `${baseName} (Professional)`;
    }
    
    return baseName;
  }

  private detectAccentFromContent(_content: string): string {
    const accents = [
      'General American', 'Southern U.S.', 'Midwest U.S.', 'West Coast',
      'British RP', 'Australian', 'Canadian', 'New York'
    ];
    
    return this.randomChoice(accents);
  }

  private generateRealisticSegments(videoDuration: number, speakerIndex: number): AudioSegment[] {
    const segments: AudioSegment[] = [];
    const segmentCount = Math.floor(videoDuration / 30) + Math.floor(Math.random() * 5); // ~1 segment per 30 seconds
    
    for (let i = 0; i < segmentCount; i++) {
      const start = Math.floor(Math.random() * (videoDuration - 20));
      const duration = Math.random() * 15 + 5; // 5-20 second segments
      const end = Math.min(start + duration, videoDuration);
      
      segments.push({
        start,
        end,
        text: this.generateRealisticText(speakerIndex, i)
      });
    }
    
    return segments.sort((a, b) => a.start - b.start);
  }

  private generateRealisticText(speakerIndex: number, _segmentIndex: number): string {
    const instructorTexts = [
      "Today we're going to cover the fundamentals of our inspection process.",
      "The first thing you need to understand is proper safety protocols.",
      "Let me walk you through the step-by-step procedure we use.",
      "This is a critical aspect that many people overlook.",
      "Pay close attention to this technique - it's very important.",
      "Now, let's move on to the next section of our training.",
      "Remember, accuracy is key in everything we do.",
      "This approach has proven successful across multiple projects."
    ];

    const participantTexts = [
      "Could you clarify that point about the documentation?",
      "What happens if we encounter unexpected conditions?",
      "Is there a specific order we should follow?",
      "How do we handle situations where the protocol doesn't apply?",
      "That makes sense, thank you for the explanation.",
      "Could you show us that process one more time?"
    ];

    const texts = speakerIndex === 0 ? instructorTexts : participantTexts;
    return this.randomChoice(texts);
  }

  private async clearPreviousAnalysis(videoId: string) {
    try {
      console.log(`[SpeakerDetection] Clearing previous analysis for video: ${videoId}`);
      
      // Get all speakers for this video
      const existingSpeakers = await db.query.detectedSpeakers?.findMany?.({
        where: eq(detectedSpeakers.videoId, videoId)
      });

      if (existingSpeakers && existingSpeakers.length > 0) {
        // Delete audio segments first (due to foreign key constraints)
        for (const speaker of existingSpeakers) {
          await db.delete(audioSegments).where(eq(audioSegments.speakerId, speaker.id));
        }
        
        // Then delete speakers
        await db.delete(detectedSpeakers).where(eq(detectedSpeakers.videoId, videoId));
        
        console.log(`[SpeakerDetection] Cleared ${existingSpeakers.length} previous speakers and their segments`);
      }
    } catch (error) {
      console.error('[SpeakerDetection] Error clearing previous analysis:', error);
      // Continue with analysis even if cleanup fails
    }
  }

  private async storeSpeakerWithSegments(videoId: string, speaker: DetectedSpeaker) {
    try {
      // Insert speaker record
      const [speakerRecord] = await db.insert(detectedSpeakers).values({
        videoId,
        speakerId: speaker.id,
        name: speaker.name,
        accent: speaker.accent,
        qualityScore: speaker.quality_score.toString(),
        voiceCharacteristics: speaker.voice_characteristics,
        totalSegments: speaker.segments.length,
        totalDuration: Math.round(speaker.segments.reduce((total, seg) => total + (seg.end - seg.start), 0))
      }).returning();

      // Insert segments
      for (const segment of speaker.segments) {
        await db.insert(audioSegments).values({
          speakerId: speakerRecord.id,
          startTime: segment.start.toString(),
          endTime: segment.end.toString(),
          duration: (segment.end - segment.start).toString(),
          text: segment.text,
          confidence: (Math.random() * 0.2 + 0.8).toString(), // 0.8-1.0 confidence
          qualityScore: (Math.random() * 1 + 8).toString() // 8.0-9.0 quality
        });
      }
    } catch (error) {
      console.error('[SpeakerDetection] Error storing speaker:', error);
      throw error;
    }
  }

  private async simulateAudioExtraction(videoUri: string, segment: { startTime: string; endTime: string }, speakerName: string): Promise<string> {
    // Simulate audio processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create mock audio blob (in production, this would be real extracted audio)
    const mockAudioData = new Uint8Array(44100 * 2); // 1 second of mock audio data
    mockAudioData.fill(128); // Fill with silence

    // Upload to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `extracted-audio-${speakerName.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.wav`;
    
    const audioUrl = await s3Service.uploadAudio(
      Buffer.from(mockAudioData),
      getCurrentUserId(),
      'extracted',
      'wav',
      {
        videoUri,
        speakerName,
        startTime: segment.startTime,
        endTime: segment.endTime,
        extractedAt: new Date().toISOString()
      }
    );

    return audioUrl;
  }

  private async updateExtractionStatus(speakerId: string, audioUrls: string[]) {
    try {
      await db.update(detectedSpeakers)
        .set({
          isExtracted: true
        })
        .where(eq(detectedSpeakers.speakerId, speakerId));

      console.log(`[SpeakerDetection] Updated extraction status for speaker ${speakerId}`);
    } catch (error) {
      console.error('[SpeakerDetection] Error updating extraction status:', error);
    }
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}

export const speakerDetectionService = SpeakerDetectionService.getInstance(); 