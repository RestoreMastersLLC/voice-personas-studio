import axios, { AxiosInstance } from 'axios';
import { configManager } from '@/config/app';
import { db } from '@/lib/db/connection';
import { elevenLabsVoices, users, apiUsage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { s3Service } from './aws-s3';
import {
  ElevenLabsVoice,
  VoiceCloneRequest,
  AudioQualityAnalysis,
  UserInfo,
  GeneratedAudio,
} from '@/lib/types';

class ElevenLabsService {
  private static instance: ElevenLabsService;
  private client: AxiosInstance;
  private connectionPool: Map<string, AxiosInstance> = new Map();

  private constructor() {
    const config = configManager.getApiConfig('elevenLabs');
    const apiKey = 'apiKey' in config ? config.apiKey : process.env.ELEVENLABS_API_KEY || '';
    
    // Singleton connection for dev, pool for production
    if (configManager.isDevelopment()) {
      this.client = this.createClient(apiKey);
    } else {
      // Create connection pool for production
      this.initializeConnectionPool(apiKey);
      this.client = this.createClient(apiKey);
    }
  }

  public static getInstance(): ElevenLabsService {
    if (!ElevenLabsService.instance) {
      ElevenLabsService.instance = new ElevenLabsService();
    }
    return ElevenLabsService.instance;
  }

  private createClient(apiKey: string): AxiosInstance {
    const client = axios.create({
      baseURL: configManager.getApiConfig('elevenLabs').baseUrl,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // Longer timeout for voice processing
    });

    this.setupInterceptors(client);
    return client;
  }

  private initializeConnectionPool(apiKey: string): void {
    const poolSize = configManager.isProduction() ? 5 : 1;
    
    for (let i = 0; i < poolSize; i++) {
      const client = this.createClient(apiKey);
      this.connectionPool.set(`client_${i}`, client);
    }
  }

  private getPooledClient(): AxiosInstance {
    if (configManager.isDevelopment()) {
      return this.client;
    }

    // Simple round-robin selection for production
    const clients = Array.from(this.connectionPool.values());
    const randomIndex = Math.floor(Math.random() * clients.length);
    return clients[randomIndex];
  }

  private setupInterceptors(client: AxiosInstance): void {
    client.interceptors.request.use(
      (config) => {
        console.log(`[ElevenLabsService] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[ElevenLabsService] Request error:', error);
        return Promise.reject(error);
      }
    );

    client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[ElevenLabsService] Response error:', error);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: unknown): Error {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number; data?: { detail?: string } }; message: string };
      const status = axiosError.response.status;
      const message = axiosError.response.data?.detail || axiosError.message;
      
      switch (status) {
        case 401:
          return new Error('ElevenLabs authentication failed. Please check your API key.');
        case 403:
          return new Error('Access forbidden. Please check your ElevenLabs subscription.');
        case 422:
          return new Error('Invalid request. Please check your input data.');
        case 429:
          return new Error('Rate limit exceeded. Please try again later.');
        default:
          return new Error(`ElevenLabs API error: ${message}`);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Error(`Network error: ${errorMessage}`);
  }

  // Get available voices
  public async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      if (configManager.isDevelopment()) {
        return this.getMockVoices();
      }

      const client = this.getPooledClient();
      const response = await client.get('/voices');
      
      return response.data.voices.map(this.transformElevenLabsVoice);
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw error;
    }
  }

  // Clone voice from audio
  public async cloneVoice(request: VoiceCloneRequest): Promise<ElevenLabsVoice> {
    try {
      if (configManager.isDevelopment()) {
        await this.delay(5000);
        return this.getMockClonedVoice(request);
      }

      const client = this.getPooledClient();
      const formData = new FormData();
      formData.append('files', request.audioFile);
      formData.append('name', request.voiceName);
      formData.append('description', request.description);

      const response = await client.post('/voices/add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return this.transformElevenLabsVoice(response.data);
    } catch (error) {
      console.error('Error cloning voice:', error);
      throw error;
    }
  }

  // Delete voice
  public async deleteVoice(voiceId: string): Promise<void> {
    try {
      if (configManager.isDevelopment()) {
        await this.delay(1000);
        return;
      }

      const client = this.getPooledClient();
      await client.delete(`/voices/${voiceId}`);
    } catch (error) {
      console.error('Error deleting voice:', error);
      throw error;
    }
  }

  // Generate speech sample
  public async generateSample(voiceId: string, text: string, settings?: Partial<ElevenLabsVoice['settings']>): Promise<GeneratedAudio> {
    try {
      if (configManager.isDevelopment()) {
        await this.delay(2000);
        return this.getMockGeneratedAudio();
      }

      const client = this.getPooledClient();
      const requestBody = {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: settings?.stability || 0.75,
          similarity_boost: settings?.similarity_boost || 0.75,
          style: settings?.style || 0.3,
        },
      };

      const response = await client.post(`/text-to-speech/${voiceId}`, requestBody, {
        responseType: 'blob',
      });

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      
      return {
        audioBlob,
        duration: Math.floor(text.length / 10), // Rough estimate
        format: 'mp3',
        url: URL.createObjectURL(audioBlob),
      };
    } catch (error) {
      console.error('Error generating speech sample:', error);
      throw error;
    }
  }

  // Update voice settings
  public async updateVoiceSettings(voiceId: string, settings: ElevenLabsVoice['settings']): Promise<void> {
    try {
      if (configManager.isDevelopment()) {
        await this.delay(500);
        return;
      }

      const client = this.getPooledClient();
      await client.post(`/voices/${voiceId}/settings/edit`, settings);
    } catch (error) {
      console.error('Error updating voice settings:', error);
      throw error;
    }
  }

  // Get user info
  public async getUserInfo(): Promise<UserInfo> {
    try {
      if (configManager.isDevelopment()) {
        return this.getMockUserInfo();
      }

      const client = this.getPooledClient();
      const response = await client.get('/user');
      
      return this.transformUserInfo(response.data);
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  // Convert audio format
  public async convertAudio(audioBlob: Blob, format: string): Promise<Blob> {
    try {
      // In development, just return the same blob
      if (configManager.isDevelopment()) {
        await this.delay(1000);
        return new Blob([audioBlob], { type: `audio/${format}` });
      }

      // In production, would integrate with audio conversion service
      throw new Error('Audio conversion not yet implemented for production');
    } catch (error) {
      console.error('Error converting audio:', error);
      throw error;
    }
  }

  // Validate audio quality
  public validateAudioQuality(audioFile: File): AudioQualityAnalysis {
    const duration = Math.random() * 300 + 30; // 30s to 5min
    const quality = Math.random() > 0.3 ? 'good' : 'poor';
    
    return {
      duration,
      quality,
      sampleRate: quality === 'good' ? '44.1kHz' : '22kHz',
      recommendations: quality === 'poor' ? 
        ['Use higher quality audio', 'Reduce background noise', 'Ensure clear speech'] : 
        ['Audio quality is excellent for cloning']
    };
  }

  // Utility methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private transformElevenLabsVoice(voiceData: Record<string, unknown>): ElevenLabsVoice {
    return {
      voice_id: voiceData.voice_id as string,
      name: voiceData.name as string,
      category: voiceData.category as 'premade' | 'cloned',
      description: (voiceData.description as string) || '',
      settings: {
        stability: 0.75,
        similarity_boost: 0.75,
        style: 0.3,
      },
    };
  }

  private transformUserInfo(userData: Record<string, unknown>): UserInfo {
    const subscription = userData.subscription as Record<string, unknown> || {};
    return {
      subscription: (subscription.subscription_tier as string) || 'Free',
      character_count: (subscription.character_count as number) || 0,
      character_limit: (subscription.character_limit as number) || 10000,
      can_clone_voices: (subscription.can_clone_voices as boolean) || false,
      voice_limit: (subscription.voice_limit as number) || 3,
      voice_count: (subscription.voice_count as number) || 0,
    };
  }

  // Mock data for development
  private getMockVoices(): ElevenLabsVoice[] {
    return [
      {
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        name: "Rachel",
        category: "premade",
        description: "Young American Female",
        settings: { stability: 0.75, similarity_boost: 0.75 }
      },
      {
        voice_id: "AZnzlk1XvdvUeBnXmlld",
        name: "Domi",
        category: "premade", 
        description: "Young American Female",
        settings: { stability: 0.75, similarity_boost: 0.75 }
      }
    ];
  }

  private getMockClonedVoice(request: VoiceCloneRequest): ElevenLabsVoice {
    return {
      voice_id: `clone_${Date.now()}`,
      name: request.voiceName,
      category: 'cloned',
      description: request.description,
      status: 'ready',
      settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.3,
      },
    };
  }

  private getMockGeneratedAudio(): GeneratedAudio {
    const audioBlob = new Blob(['mock audio'], { type: 'audio/mpeg' });
    return {
      audioBlob,
      duration: 10,
      format: 'mp3',
      url: URL.createObjectURL(audioBlob),
    };
  }

  private getMockUserInfo(): UserInfo {
    return {
      subscription: "Creator",
      character_count: 45230,
      character_limit: 100000,
      can_clone_voices: true,
      voice_limit: 10,
      voice_count: 3,
    };
  }

  public async validateConnection(): Promise<boolean> {
    try {
      if (configManager.isDevelopment()) {
        return true;
      }
      
      await this.getUserInfo();
      return true;
    } catch (error) {
      console.error('ElevenLabs connection validation failed:', error);
      return false;
    }
  }
}

export const elevenLabsService = ElevenLabsService.getInstance(); 