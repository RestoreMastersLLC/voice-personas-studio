import { AppConfig, Environment } from '@/lib/types';

const environment: Environment = (process.env.NODE_ENV as Environment) || 'development';

const config: AppConfig = {
  environment,
  api: {
          vimeo: {
        baseUrl: process.env.NEXT_PUBLIC_VIMEO_API_URL || 'https://api.vimeo.com',
        accessToken: process.env.VIMEO_ACCESS_TOKEN || '',
        clientId: process.env.VIMEO_CLIENT_ID || '',
        clientSecret: process.env.VIMEO_CLIENT_SECRET || '',
      },
    elevenLabs: {
      baseUrl: process.env.NEXT_PUBLIC_ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1',
      apiKey: process.env.ELEVENLABS_API_KEY || '',
    },
  },
  audio: {
    maxDuration: 300, // 5 minutes
    supportedFormats: ['mp3', 'wav', 'flac', 'ogg'],
    qualityThreshold: 8.0, // Minimum quality score for voice cloning
  },
};

// Singleton pattern - ensure single configuration instance
class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = config;
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public getEnvironment(): Environment {
    return this.config.environment;
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isTest(): boolean {
    return this.config.environment === 'test';
  }

  public getApiConfig(service: 'vimeo' | 'elevenLabs') {
    return this.config.api[service];
  }

  public getAudioConfig() {
    return this.config.audio;
  }

  // Validate configuration on startup
  public validateConfig(): boolean {
    const { vimeo, elevenLabs } = this.config.api;
    
    if (this.isProduction()) {
      if (!vimeo.accessToken) {
        console.error('Vimeo access token is required in production');
        return false;
      }
      if (!elevenLabs.apiKey) {
        console.error('ElevenLabs API key is required in production');
        return false;
      }
    }

    return true;
  }
}

export const configManager = ConfigManager.getInstance();
export default config; 