import { pgTable, text, timestamp, integer, decimal, boolean, json, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('voice_personas_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }),
  subscription: varchar('subscription', { length: 50 }).default('free'),
  elevenLabsApiKey: text('eleven_labs_api_key'),
  vimeoAccessToken: text('vimeo_access_token'),
  preferences: json('preferences'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Voice Personas table
export const voicePersonas = pgTable('voice_personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  region: varchar('region', { length: 100 }),
  accent: varchar('accent', { length: 100 }),
  age: integer('age'),
  tone: varchar('tone', { length: 100 }),
  energy: varchar('energy', { length: 50 }),
  description: text('description'),
  avatar: varchar('avatar', { length: 500 }),
  sampleText: text('sample_text'),
  voiceSettings: json('voice_settings'), // { pitch, rate, volume }
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ElevenLabs Voices table
export const elevenLabsVoices = pgTable('eleven_labs_voices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  voiceId: varchar('voice_id', { length: 255 }).notNull(), // ElevenLabs voice ID
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }), // 'premade' | 'cloned'
  description: text('description'),
  status: varchar('status', { length: 50 }).default('ready'),
  source: varchar('source', { length: 50 }), // 'vimeo' | 'upload' | 'premade'
  settings: json('settings'), // { stability, similarity_boost, style }
  sourceVideoId: uuid('source_video_id'),
  sourceSpeakerId: uuid('source_speaker_id'),
  extractedSegments: integer('extracted_segments'),
  qualityScore: decimal('quality_score', { precision: 3, scale: 1 }),
  usageCount: integer('usage_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Vimeo Videos table
export const vimeoVideos = pgTable('vimeo_videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  vimeoUri: varchar('vimeo_uri', { length: 255 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  duration: integer('duration'), // in seconds
  thumbnail: text('thumbnail'),
  link: text('link'),
  privacy: varchar('privacy', { length: 50 }),
  tags: json('tags'), // string array
  stats: json('stats'), // { plays, etc }
  analysisStatus: varchar('analysis_status', { length: 50 }).default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
  speakersDetected: integer('speakers_detected').default(0),
  totalSpeechDuration: integer('total_speech_duration'),
  backgroundNoiseLevel: varchar('background_noise_level', { length: 50 }),
  qualityAssessment: varchar('quality_assessment', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Detected Speakers table
export const detectedSpeakers = pgTable('detected_speakers', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoId: uuid('video_id').references(() => vimeoVideos.id, { onDelete: 'cascade' }),
  speakerId: varchar('speaker_id', { length: 255 }).notNull(), // internal speaker ID
  name: varchar('name', { length: 255 }),
  accent: varchar('accent', { length: 100 }),
  qualityScore: decimal('quality_score', { precision: 3, scale: 1 }),
  voiceCharacteristics: json('voice_characteristics'), // { pitch, tempo, emotion, clarity }
  totalSegments: integer('total_segments').default(0),
  totalDuration: integer('total_duration').default(0), // in seconds
  isExtracted: boolean('is_extracted').default(false),
  isCloned: boolean('is_cloned').default(false),
  clonedVoiceId: uuid('cloned_voice_id').references(() => elevenLabsVoices.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Audio Segments table
export const audioSegments = pgTable('audio_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  speakerId: uuid('speaker_id').references(() => detectedSpeakers.id, { onDelete: 'cascade' }),
  startTime: decimal('start_time', { precision: 8, scale: 2 }).notNull(), // in seconds
  endTime: decimal('end_time', { precision: 8, scale: 2 }).notNull(), // in seconds
  duration: decimal('duration', { precision: 8, scale: 2 }).notNull(), // in seconds
  text: text('text'),
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // transcription confidence
  audioUrl: text('audio_url'), // S3 URL for extracted audio
  isSelected: boolean('is_selected').default(false),
  isExtracted: boolean('is_extracted').default(false),
  qualityScore: decimal('quality_score', { precision: 3, scale: 1 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Generated Audio table
export const generatedAudio = pgTable('generated_audio', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  voicePersonaId: uuid('voice_persona_id').references(() => voicePersonas.id),
  elevenLabsVoiceId: uuid('eleven_labs_voice_id').references(() => elevenLabsVoices.id),
  scriptText: text('script_text').notNull(),
  audioUrl: text('audio_url'), // S3 URL
  duration: decimal('duration', { precision: 8, scale: 2 }), // in seconds
  format: varchar('format', { length: 10 }).default('mp3'),
  fileSize: integer('file_size'), // in bytes
  characterCount: integer('character_count'),
  generationTime: integer('generation_time'), // in milliseconds
  settings: json('settings'), // voice settings used
  campaign: varchar('campaign', { length: 255 }), // optional campaign tracking
  region: varchar('region', { length: 100 }), // target region
  isDownloaded: boolean('is_downloaded').default(false),
  downloadCount: integer('download_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Analytics table
export const analytics = pgTable('voice_personas_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'voice_generated', 'voice_cloned', 'video_analyzed', etc.
  entityType: varchar('entity_type', { length: 50 }), // 'voice_persona', 'eleven_labs_voice', 'vimeo_video'
  entityId: uuid('entity_id'),
  metadata: json('metadata'), // additional event data
  region: varchar('region', { length: 100 }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  sessionId: varchar('session_id', { length: 255 }),
  timestamp: timestamp('timestamp').defaultNow(),
});

// API Usage Tracking table
export const apiUsage = pgTable('voice_personas_api_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  service: varchar('service', { length: 50 }).notNull(), // 'elevenlabs', 'vimeo', 'aws_s3'
  operation: varchar('operation', { length: 100 }).notNull(), // 'generate_speech', 'clone_voice', 'get_videos'
  requestCount: integer('request_count').default(1),
  charactersUsed: integer('characters_used').default(0), // for ElevenLabs
  bytesTransferred: integer('bytes_transferred').default(0), // for S3
  cost: decimal('cost', { precision: 10, scale: 4 }), // estimated cost
  responseTime: integer('response_time'), // in milliseconds
  status: varchar('status', { length: 20 }).default('success'), // 'success', 'error', 'rate_limited'
  errorMessage: text('error_message'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  voicePersonas: many(voicePersonas),
  elevenLabsVoices: many(elevenLabsVoices),
  vimeoVideos: many(vimeoVideos),
  generatedAudio: many(generatedAudio),
  analytics: many(analytics),
  apiUsage: many(apiUsage),
}));

export const voicePersonasRelations = relations(voicePersonas, ({ one, many }) => ({
  user: one(users, { fields: [voicePersonas.userId], references: [users.id] }),
  generatedAudio: many(generatedAudio),
}));

export const elevenLabsVoicesRelations = relations(elevenLabsVoices, ({ one, many }) => ({
  user: one(users, { fields: [elevenLabsVoices.userId], references: [users.id] }),
  sourceSpeaker: one(detectedSpeakers, { fields: [elevenLabsVoices.sourceSpeakerId], references: [detectedSpeakers.id] }),
  generatedAudio: many(generatedAudio),
}));

export const vimeoVideosRelations = relations(vimeoVideos, ({ one, many }) => ({
  user: one(users, { fields: [vimeoVideos.userId], references: [users.id] }),
  detectedSpeakers: many(detectedSpeakers),
}));

export const detectedSpeakersRelations = relations(detectedSpeakers, ({ one, many }) => ({
  video: one(vimeoVideos, { fields: [detectedSpeakers.videoId], references: [vimeoVideos.id] }),
  audioSegments: many(audioSegments),
  clonedVoice: one(elevenLabsVoices, { fields: [detectedSpeakers.clonedVoiceId], references: [elevenLabsVoices.id] }),
}));

export const audioSegmentsRelations = relations(audioSegments, ({ one }) => ({
  speaker: one(detectedSpeakers, { fields: [audioSegments.speakerId], references: [detectedSpeakers.id] }),
}));

export const generatedAudioRelations = relations(generatedAudio, ({ one }) => ({
  user: one(users, { fields: [generatedAudio.userId], references: [users.id] }),
  voicePersona: one(voicePersonas, { fields: [generatedAudio.voicePersonaId], references: [voicePersonas.id] }),
  elevenLabsVoice: one(elevenLabsVoices, { fields: [generatedAudio.elevenLabsVoiceId], references: [elevenLabsVoices.id] }),
})); 