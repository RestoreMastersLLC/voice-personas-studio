-- Voice Personas Database Setup Script
-- Safe installation - only creates tables if they don't exist
-- Run with: psql -d your_database -f database_setup.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for Voice Personas platform
CREATE TABLE IF NOT EXISTS voice_personas_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  subscription VARCHAR(50) DEFAULT 'free',
  eleven_labs_api_key TEXT,
  vimeo_access_token TEXT,
  preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Voice Personas table
CREATE TABLE IF NOT EXISTS voice_personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES voice_personas_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  accent VARCHAR(100),
  age INTEGER,
  tone VARCHAR(100),
  energy VARCHAR(50),
  description TEXT,
  avatar VARCHAR(10),
  sample_text TEXT,
  voice_settings JSONB,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ElevenLabs Voices table
CREATE TABLE IF NOT EXISTS eleven_labs_voices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES voice_personas_users(id) ON DELETE CASCADE,
  voice_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  status VARCHAR(50) DEFAULT 'ready',
  source VARCHAR(50),
  settings JSONB,
  source_video_id UUID,
  source_speaker_id UUID,
  extracted_segments INTEGER,
  quality_score DECIMAL(3,1),
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vimeo Videos table
CREATE TABLE IF NOT EXISTS vimeo_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES voice_personas_users(id) ON DELETE CASCADE,
  vimeo_uri VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  duration INTEGER,
  thumbnail TEXT,
  link TEXT,
  privacy VARCHAR(50),
  tags JSONB,
  stats JSONB,
  analysis_status VARCHAR(50) DEFAULT 'pending',
  speakers_detected INTEGER DEFAULT 0,
  total_speech_duration INTEGER,
  background_noise_level VARCHAR(50),
  quality_assessment VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Detected Speakers table
CREATE TABLE IF NOT EXISTS detected_speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES vimeo_videos(id) ON DELETE CASCADE,
  speaker_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  accent VARCHAR(100),
  quality_score DECIMAL(3,1),
  voice_characteristics JSONB,
  total_segments INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  is_extracted BOOLEAN DEFAULT FALSE,
  is_cloned BOOLEAN DEFAULT FALSE,
  cloned_voice_id UUID REFERENCES eleven_labs_voices(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audio Segments table
CREATE TABLE IF NOT EXISTS audio_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  speaker_id UUID REFERENCES detected_speakers(id) ON DELETE CASCADE,
  start_time DECIMAL(8,2) NOT NULL,
  end_time DECIMAL(8,2) NOT NULL,
  duration DECIMAL(8,2) NOT NULL,
  text TEXT,
  confidence DECIMAL(3,2),
  audio_url TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  is_extracted BOOLEAN DEFAULT FALSE,
  quality_score DECIMAL(3,1),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Generated Audio table
CREATE TABLE IF NOT EXISTS generated_audio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES voice_personas_users(id) ON DELETE CASCADE,
  voice_persona_id UUID REFERENCES voice_personas(id),
  eleven_labs_voice_id UUID REFERENCES eleven_labs_voices(id),
  script_text TEXT NOT NULL,
  audio_url TEXT,
  duration DECIMAL(8,2),
  format VARCHAR(10) DEFAULT 'mp3',
  file_size INTEGER,
  character_count INTEGER,
  generation_time INTEGER,
  settings JSONB,
  campaign VARCHAR(255),
  region VARCHAR(100),
  is_downloaded BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Voice Personas API Usage table (separate from existing analytics)
CREATE TABLE IF NOT EXISTS voice_personas_api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES voice_personas_users(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  request_count INTEGER DEFAULT 1,
  characters_used INTEGER DEFAULT 0,
  bytes_transferred INTEGER DEFAULT 0,
  cost DECIMAL(10,4),
  response_time INTEGER,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Voice Personas Analytics table (separate from existing analytics)
CREATE TABLE IF NOT EXISTS voice_personas_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES voice_personas_users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  region VARCHAR(100),
  user_agent TEXT,
  ip_address VARCHAR(45),
  session_id VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voice_personas_user_id ON voice_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_eleven_labs_voices_user_id ON eleven_labs_voices(user_id);
CREATE INDEX IF NOT EXISTS idx_vimeo_videos_user_id ON vimeo_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_detected_speakers_video_id ON detected_speakers(video_id);
CREATE INDEX IF NOT EXISTS idx_audio_segments_speaker_id ON audio_segments(speaker_id);
CREATE INDEX IF NOT EXISTS idx_generated_audio_user_id ON generated_audio(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_personas_api_usage_user_id ON voice_personas_api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_personas_analytics_user_id ON voice_personas_analytics(user_id);

-- Insert default voice personas
INSERT INTO voice_personas (
  name, region, accent, age, tone, energy, description, avatar, sample_text, voice_settings, is_default
) VALUES 
(
  'Sarah Belle', 'Southern U.S.', 'Southern', 28, 'Warm & Hospitable', 'Medium', 
  'Embodies Southern charm and hospitality with a focus on relationship building',
  '👩‍🦱', 'Well hello there! Welcome to our family-owned business...',
  '{"pitch": 0.8, "rate": 0.9, "volume": 0.8}', TRUE
),
(
  'James Windsor', 'British', 'Received Pronunciation', 42, 'Refined & Authoritative', 'Medium-Low',
  'Projects sophistication and trustworthiness with refined British delivery',
  '👨‍💼', 'Good afternoon. I should like to present our distinguished services...',
  '{"pitch": 0.6, "rate": 0.85, "volume": 0.9}', TRUE
),
(
  'Olivia Reef', 'Australian', 'General Australian', 31, 'Friendly & Approachable', 'Medium-High',
  'Brings warmth and authenticity with a genuine Australian approach',
  '👩‍🦰', 'G''day! Let me tell you about this brilliant opportunity...',
  '{"pitch": 0.9, "rate": 1.0, "volume": 0.85}', TRUE
),
(
  'Mike Heartland', 'Midwest U.S.', 'General American', 39, 'Genuine & Straightforward', 'Medium',
  'Represents Midwest values of honesty and hard work',
  '👨‍🌾', 'Hi there, folks. Let me give it to you straight...',
  '{"pitch": 0.7, "rate": 0.9, "volume": 0.9}', TRUE
),
(
  'Elena Brooklyn', 'New York', 'New York', 34, 'Direct & Confident', 'High',
  'Fast-paced and results-oriented with New York energy',
  '👩‍💼', 'Listen, I''m gonna cut right to the chase here...',
  '{"pitch": 0.85, "rate": 1.1, "volume": 0.95}', TRUE
),
(
  'Carlos Malibu', 'West Coast', 'California', 29, 'Laid-back & Innovative', 'Medium',
  'Embodies West Coast innovation and relaxed confidence',
  '👨‍💻', 'Hey there! So I''ve got this amazing solution for you...',
  '{"pitch": 0.75, "rate": 0.95, "volume": 0.8}', TRUE
),
(
  'Rebecca Lone Star', 'Texas', 'Texas', 36, 'Bold & Pioneering', 'High',
  'Represents Texas spirit of independence and bold thinking',
  '👩‍🤠', 'Howdy! Let me tell y''all about something that''s gonna change everything...',
  '{"pitch": 0.8, "rate": 1.0, "volume": 0.9}', TRUE
),
(
  'Alex Maple', 'Canadian', 'Canadian', 33, 'Polite & Inclusive', 'Medium',
  'Brings Canadian warmth and inclusive approach to sales',
  '👨‍🍁', 'Hi there, eh! I''d love to share this opportunity with you...',
  '{"pitch": 0.75, "rate": 0.9, "volume": 0.85}', TRUE
)
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Voice Personas database tables created successfully!';
    RAISE NOTICE 'Tables created: voice_personas_users, voice_personas, eleven_labs_voices, vimeo_videos, detected_speakers, audio_segments, generated_audio, voice_personas_api_usage, voice_personas_analytics';
    RAISE NOTICE 'Default voice personas inserted: 8 regional personas ready for use';
END
$$; 