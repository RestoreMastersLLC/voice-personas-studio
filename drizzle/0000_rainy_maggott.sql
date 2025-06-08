CREATE TABLE "analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"metadata" json,
	"region" varchar(100),
	"user_agent" text,
	"ip_address" varchar(45),
	"session_id" varchar(255),
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"service" varchar(50) NOT NULL,
	"operation" varchar(100) NOT NULL,
	"request_count" integer DEFAULT 1,
	"characters_used" integer DEFAULT 0,
	"bytes_transferred" integer DEFAULT 0,
	"cost" numeric(10, 4),
	"response_time" integer,
	"status" varchar(20) DEFAULT 'success',
	"error_message" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audio_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speaker_id" uuid,
	"start_time" numeric(8, 2) NOT NULL,
	"end_time" numeric(8, 2) NOT NULL,
	"duration" numeric(8, 2) NOT NULL,
	"text" text,
	"confidence" numeric(3, 2),
	"audio_url" text,
	"is_selected" boolean DEFAULT false,
	"is_extracted" boolean DEFAULT false,
	"quality_score" numeric(3, 1),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "detected_speakers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid,
	"speaker_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"accent" varchar(100),
	"quality_score" numeric(3, 1),
	"voice_characteristics" json,
	"total_segments" integer DEFAULT 0,
	"total_duration" integer DEFAULT 0,
	"is_extracted" boolean DEFAULT false,
	"is_cloned" boolean DEFAULT false,
	"cloned_voice_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eleven_labs_voices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"voice_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50),
	"description" text,
	"status" varchar(50) DEFAULT 'ready',
	"source" varchar(50),
	"settings" json,
	"source_video_id" uuid,
	"source_speaker_id" uuid,
	"extracted_segments" integer,
	"quality_score" numeric(3, 1),
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "generated_audio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"voice_persona_id" uuid,
	"eleven_labs_voice_id" uuid,
	"script_text" text NOT NULL,
	"audio_url" text,
	"duration" numeric(8, 2),
	"format" varchar(10) DEFAULT 'mp3',
	"file_size" integer,
	"character_count" integer,
	"generation_time" integer,
	"settings" json,
	"campaign" varchar(255),
	"region" varchar(100),
	"is_downloaded" boolean DEFAULT false,
	"download_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"name" varchar(255),
	"subscription" varchar(50) DEFAULT 'free',
	"eleven_labs_api_key" text,
	"vimeo_access_token" text,
	"preferences" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vimeo_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"vimeo_uri" varchar(255) NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"duration" integer,
	"thumbnail" text,
	"link" text,
	"privacy" varchar(50),
	"tags" json,
	"stats" json,
	"analysis_status" varchar(50) DEFAULT 'pending',
	"speakers_detected" integer DEFAULT 0,
	"total_speech_duration" integer,
	"background_noise_level" varchar(50),
	"quality_assessment" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"region" varchar(100),
	"accent" varchar(100),
	"age" integer,
	"tone" varchar(100),
	"energy" varchar(50),
	"description" text,
	"avatar" varchar(10),
	"sample_text" text,
	"voice_settings" json,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_segments" ADD CONSTRAINT "audio_segments_speaker_id_detected_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."detected_speakers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_speakers" ADD CONSTRAINT "detected_speakers_video_id_vimeo_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."vimeo_videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detected_speakers" ADD CONSTRAINT "detected_speakers_cloned_voice_id_eleven_labs_voices_id_fk" FOREIGN KEY ("cloned_voice_id") REFERENCES "public"."eleven_labs_voices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eleven_labs_voices" ADD CONSTRAINT "eleven_labs_voices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_audio" ADD CONSTRAINT "generated_audio_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_audio" ADD CONSTRAINT "generated_audio_voice_persona_id_voice_personas_id_fk" FOREIGN KEY ("voice_persona_id") REFERENCES "public"."voice_personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_audio" ADD CONSTRAINT "generated_audio_eleven_labs_voice_id_eleven_labs_voices_id_fk" FOREIGN KEY ("eleven_labs_voice_id") REFERENCES "public"."eleven_labs_voices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vimeo_videos" ADD CONSTRAINT "vimeo_videos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_personas" ADD CONSTRAINT "voice_personas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;