import axios, { AxiosInstance } from 'axios';
import { configManager } from '@/config/app';
import { 
  VimeoVideo, 
  DetectedSpeaker, 
  ProcessedAudioSegment,
  PaginatedResponse
} from '@/lib/types';

// Vimeo API response types
interface VimeoApiVideo {
  uri: string;
  name: string;
  description: string | null;
  duration: number;
  pictures: {
    sizes: Array<{
      width: number;
      height: number;
      link: string;
    }>;
  };
  link: string;
  privacy: {
    view: string;
  };
  tags: Array<{ name: string }>;
  stats: {
    plays: number;
  };
  created_time: string;
  modified_time: string;
}

class VimeoService {
  private static instance: VimeoService;
  private client: AxiosInstance;
  private isInitialized = false;

  private constructor() {
    const vimeoConfig = configManager.getApiConfig('vimeo') as { baseUrl: string; accessToken: string; clientId: string; clientSecret: string; };
    
    this.client = axios.create({
      baseURL: vimeoConfig.baseUrl,
      headers: {
        'Authorization': `Bearer ${vimeoConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  public static getInstance(): VimeoService {
    if (!VimeoService.instance) {
      VimeoService.instance = new VimeoService();
    }
    return VimeoService.instance;
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[VimeoService] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[VimeoService] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[VimeoService] Response error:', error);
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: unknown): Error {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number; data?: { error?: string } }; message: string };
      const status = axiosError.response.status;
      const message = axiosError.response.data?.error || axiosError.message;
      
      switch (status) {
        case 401:
          return new Error('Vimeo authentication failed. Please check your access token.');
        case 403:
          return new Error('Access forbidden. Please check your Vimeo permissions.');
        case 404:
          return new Error('Vimeo resource not found.');
        case 429:
          return new Error('Rate limit exceeded. Please try again later.');
        default:
          return new Error(`Vimeo API error: ${message}`);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Error(`Network error: ${errorMessage}`);
  }

  // Get user's Vimeo videos with pagination and search
  public async getVideos(
    page = 1, 
    perPage = 20, 
    query = ''
  ): Promise<PaginatedResponse<VimeoVideo>> {
    try {
      // Check if we have access token for real API
      const vimeoConfig = configManager.getApiConfig('vimeo') as { baseUrl: string; accessToken: string; clientId: string; clientSecret: string; };
      if (!vimeoConfig.accessToken || vimeoConfig.accessToken === 'your_vimeo_token_here') {
        console.log('[VimeoService] No access token, using mock data');
        return this.getMockVideos(page, perPage, query);
      }

      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
        fields: 'uri,name,description,duration,created_time,pictures,link,privacy,tags,stats',
      };

      if (query) {
        params.query = query;
      }

      const response = await this.client.get('/me/videos', { params });
      
      return {
        data: response.data.data.map(this.transformVimeoVideo),
        total: response.data.total,
        page: response.data.page,
        per_page: response.data.per_page,
      };
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  }

  // Extract audio segment from video (mock implementation)
  public async extractAudioSegment(
    videoUri: string, 
    startTime: number, 
    endTime: number
  ): Promise<ProcessedAudioSegment> {
    try {
      // Simulate processing time
      await this.delay(3000);
      
      // In production, this would integrate with video processing services
      if (configManager.isProduction()) {
        // TODO: Implement actual video-to-audio extraction
        throw new Error('Audio extraction not yet implemented for production');
      }

      // Mock extracted audio for development
      const mockAudioData = new Blob(['mock audio data'], { type: 'audio/wav' });
      
      return {
        start: startTime,
        end: endTime,
        text: `Extracted segment from ${startTime}s to ${endTime}s`,
        audioBlob: mockAudioData,
        duration: endTime - startTime,
        quality: 'high',
        sampleRate: '44.1kHz',
      };
    } catch (error) {
      console.error('Error extracting audio segment:', error);
      throw error;
    }
  }

  // Analyze video for speakers (AI-powered speaker detection)
  public async analyzeVideoSpeakers(videoUri: string): Promise<DetectedSpeaker[]> {
    try {
      console.log(`[VimeoService] Analyzing speakers for video: ${videoUri}`);
      
      // Simulate analysis time
      await this.delay(4000);
      
      if (configManager.isProduction()) {
        // TODO: Integrate with AI services for speaker detection
        throw new Error('Speaker analysis not yet implemented for production');
      }

      // Return mock speaker data for development
      return this.getMockSpeakers();
    } catch (error) {
      console.error('Error analyzing video speakers:', error);
      throw error;
    }
  }

  // Utility methods
  private transformVimeoVideo(vimeoData: VimeoApiVideo): VimeoVideo {
    return {
      uri: vimeoData.uri,
      name: vimeoData.name,
      description: vimeoData.description || '',
      duration: vimeoData.duration,
      created_time: vimeoData.created_time,
      thumbnail: vimeoData.pictures?.sizes?.[0]?.link || '',
      link: vimeoData.link,
      privacy: vimeoData.privacy?.view || 'private',
      tags: vimeoData.tags?.map(tag => tag.name) || [],
      stats: {
        plays: vimeoData.stats?.plays || 0,
      },
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock data for development
  private getMockVideos(page: number, perPage: number, query: string): PaginatedResponse<VimeoVideo> {
    const mockVideos: VimeoVideo[] = [
      {
        uri: '/videos/123456789',
        name: 'Sarah Belle - Southern Sales Training Call',
        description: 'Training session featuring Southern hospitality approach',
        duration: 245,
        created_time: '2024-01-15T10:30:00Z',
        thumbnail: 'https://i.vimeocdn.com/video/mock1.jpg',
        link: 'https://vimeo.com/123456789',
        privacy: 'private',
        tags: ['training', 'sales', 'southern'],
        stats: { plays: 156 },
        detected_speakers: [
          {
            id: 'speaker_1',
            name: 'Sarah Belle',
            accent: 'Southern U.S.',
            segments: [
              { start: 12, end: 45, text: "Well hello there! Welcome to our sales training..." },
              { start: 67, end: 120, text: "Now, when y'all approach a client, remember..." },
              { start: 145, end: 190, text: "The key to Southern charm in sales is authenticity..." }
            ],
            quality_score: 8.5,
            voice_characteristics: {
              pitch: 'Medium-High',
              tempo: 'Moderate',
              emotion: 'Warm & Friendly',
              clarity: 'Excellent'
            }
          }
        ]
      },
      {
        uri: '/videos/123456790',
        name: 'James Windsor - British Executive Presentation',
        description: 'Executive presentation with refined British delivery',
        duration: 180,
        created_time: '2024-01-20T14:15:00Z',
        thumbnail: 'https://i.vimeocdn.com/video/mock2.jpg',
        link: 'https://vimeo.com/123456790',
        privacy: 'private',
        tags: ['executive', 'presentation', 'british'],
        stats: { plays: 203 },
        detected_speakers: [
          {
            id: 'speaker_2',
            name: 'James Windsor',
            accent: 'British RP',
            segments: [
              { start: 5, end: 35, text: "Good afternoon, distinguished colleagues..." },
              { start: 45, end: 88, text: "I should like to present our quarterly findings..." },
              { start: 95, end: 140, text: "The data suggests a rather remarkable trend..." }
            ],
            quality_score: 9.2,
            voice_characteristics: {
              pitch: 'Medium-Low',
              tempo: 'Measured',
              emotion: 'Professional & Authoritative',
              clarity: 'Exceptional'
            }
          }
        ]
      }
    ];

    // Filter by query if provided
    const filteredVideos = query 
      ? mockVideos.filter(v => 
          v.name.toLowerCase().includes(query.toLowerCase()) ||
          v.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        )
      : mockVideos;

    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;

    return {
      data: filteredVideos.slice(startIndex, endIndex),
      total: filteredVideos.length,
      page,
      per_page: perPage,
    };
  }

  private getMockSpeakers(): DetectedSpeaker[] {
    return [
      {
        id: 'speaker_1',
        name: 'Sarah Belle',
        accent: 'Southern U.S.',
        segments: [
          { start: 12, end: 45, text: "Well hello there! Welcome to our sales training..." },
          { start: 67, end: 120, text: "Now, when y'all approach a client, remember..." },
        ],
        quality_score: 8.5,
        voice_characteristics: {
          pitch: 'Medium-High',
          tempo: 'Moderate',
          emotion: 'Warm & Friendly',
          clarity: 'Excellent'
        }
      }
    ];
  }

  public async validateConnection(): Promise<boolean> {
    try {
      if (configManager.isDevelopment()) {
        return true;
      }
      
      await this.client.get('/me');
      return true;
    } catch (error) {
      console.error('Vimeo connection validation failed:', error);
      return false;
    }
  }
}

export const vimeoService = VimeoService.getInstance(); 