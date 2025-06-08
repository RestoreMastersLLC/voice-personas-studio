import { configManager } from '@/config/app';
import { elevenLabsService } from './elevenlabs.service';
import { VoicePersona, GeneratedAudio, TTSRequest } from '@/lib/types';

class TTSService {
  private static instance: TTSService;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (configManager.isProduction()) {
        // Validate ElevenLabs connection in production
        const isConnected = await elevenLabsService.validateConnection();
        if (!isConnected) {
          throw new Error('Failed to connect to ElevenLabs service');
        }
      }

      this.isInitialized = true;
      console.log('[TTSService] Initialized successfully');
    } catch (error) {
      console.error('[TTSService] Initialization failed:', error);
      throw error;
    }
  }

  // Generate speech from text using voice persona
  public async synthesize(text: string, voiceSettings: VoicePersona['voiceSettings'], voiceId?: string): Promise<GeneratedAudio> {
    try {
      await this.initialize();

      if (configManager.isDevelopment()) {
        return this.generateMockAudio(text, voiceSettings);
      }

      if (!voiceId) {
        throw new Error('Voice ID is required for production TTS');
      }

      // Use ElevenLabs for production
      return await elevenLabsService.generateSample(voiceId, text, {
        stability: voiceSettings.pitch,
        similarity_boost: voiceSettings.rate,
        style: voiceSettings.volume,
      });
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      throw error;
    }
  }

  // Generate speech using browser TTS (fallback/development)
  public async synthesizeWithBrowserTTS(text: string, voiceSettings: VoicePersona['voiceSettings']): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported in this browser'));
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = voiceSettings.pitch;
        utterance.rate = voiceSettings.rate;
        utterance.volume = voiceSettings.volume;

        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

        speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Convert audio to different format
  public async convert(audioBlob: Blob, format: string): Promise<Blob> {
    try {
      if (configManager.isDevelopment()) {
        // Mock conversion in development
        await this.delay(1000);
        return new Blob([audioBlob], { type: `audio/${format}` });
      }

      // Use ElevenLabs conversion service
      return await elevenLabsService.convertAudio(audioBlob, format);
    } catch (error) {
      console.error('Error converting audio:', error);
      throw error;
    }
  }

  // Batch generate multiple audio files
  public async batchSynthesize(requests: TTSRequest[]): Promise<GeneratedAudio[]> {
    try {
      const results: GeneratedAudio[] = [];

      // Process requests sequentially to avoid rate limits
      for (const request of requests) {
        const audio = await this.synthesize(request.text, request.voiceSettings, request.voiceId);
        results.push(audio);

        // Add delay between requests in production
        if (configManager.isProduction()) {
          await this.delay(1000);
        }
      }

      return results;
    } catch (error) {
      console.error('Error in batch synthesis:', error);
      throw error;
    }
  }

  // Get available voices for TTS
  public async getAvailableVoices(): Promise<{ id: string; name: string; language: string }[]> {
    try {
      if (configManager.isDevelopment()) {
        return this.getMockBrowserVoices();
      }

      const elevenLabsVoices = await elevenLabsService.getVoices();
      return elevenLabsVoices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        language: 'en-US', // Default language
      }));
    } catch (error) {
      console.error('Error fetching available voices:', error);
      throw error;
    }
  }

  // Estimate generation time based on text length
  public estimateGenerationTime(text: string): number {
    // Rough estimate: 1 second per 10 characters
    return Math.max(1, Math.ceil(text.length / 10));
  }

  // Validate text for TTS
  public validateText(text: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!text || text.trim().length === 0) {
      errors.push('Text cannot be empty');
    }

    if (text.length > 5000) {
      errors.push('Text is too long (max 5000 characters)');
    }

    if (text.length < 10) {
      errors.push('Text should be at least 10 characters long for best results');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Private utility methods
  private async generateMockAudio(text: string, _voiceSettings: VoicePersona['voiceSettings']): Promise<GeneratedAudio> {
    // Simulate processing time based on text length
    const processingTime = Math.min(5000, text.length * 50);
    await this.delay(processingTime);

    // Create mock audio blob
    const mockAudioData = new Blob(['mock audio data'], { type: 'audio/mpeg' });
    const duration = Math.floor(text.length / 10); // Rough estimate

    return {
      audioBlob: mockAudioData,
      duration,
      format: 'mp3',
      url: URL.createObjectURL(mockAudioData),
    };
  }

  private getMockBrowserVoices(): { id: string; name: string; language: string }[] {
    if ('speechSynthesis' in window) {
      const voices = speechSynthesis.getVoices();
      return voices
        .filter(voice => voice.lang.startsWith('en'))
        .map(voice => ({
          id: voice.voiceURI,
          name: voice.name,
          language: voice.lang,
        }));
    }

    // Fallback mock voices
    return [
      { id: 'mock-en-us-1', name: 'English (US) - Female', language: 'en-US' },
      { id: 'mock-en-us-2', name: 'English (US) - Male', language: 'en-US' },
      { id: 'mock-en-gb-1', name: 'English (UK) - Female', language: 'en-GB' },
    ];
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Performance monitoring
  public async measureSynthesisPerformance(text: string, voiceSettings: VoicePersona['voiceSettings']): Promise<{
    duration: number;
    audioLength: number;
    efficiency: number;
  }> {
    const startTime = Date.now();
    const audio = await this.synthesize(text, voiceSettings);
    const endTime = Date.now();

    const processingDuration = endTime - startTime;
    const efficiency = audio.duration / (processingDuration / 1000); // Audio seconds per processing second

    return {
      duration: processingDuration,
      audioLength: audio.duration,
      efficiency,
    };
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      if (configManager.isDevelopment()) {
        return true;
      }

      return await elevenLabsService.validateConnection();
    } catch (error) {
      console.error('[TTSService] Health check failed:', error);
      return false;
    }
  }
}

export const ttsService = TTSService.getInstance(); 