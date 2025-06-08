import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { configManager } from '@/config/app';

// AWS S3 Service Singleton
class AWSS3Service {
  private static instance: AWSS3Service;
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  private constructor() {
    this.region = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET || process.env.NEXT_PUBLIC_AWS_S3_BUCKET || '';

    if (!this.bucket) {
      throw new Error('AWS S3 bucket configuration is missing');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    console.log(`[AWSS3Service] Initialized with bucket: ${this.bucket} in region: ${this.region}`);
  }

  public static getInstance(): AWSS3Service {
    if (!AWSS3Service.instance) {
      AWSS3Service.instance = new AWSS3Service();
    }
    return AWSS3Service.instance;
  }

  // Upload file to S3
  public async uploadFile(
    key: string,
    buffer: Buffer | Uint8Array,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      // Sanitize metadata for AWS S3 headers
      const sanitizedMetadata = this.sanitizeMetadata(metadata);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: sanitizedMetadata,
      });

      await this.s3Client.send(command);
      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      
      console.log(`[AWSS3Service] File uploaded successfully: ${key}`);
      return url;
    } catch (error) {
      console.error('[AWSS3Service] Upload failed:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  // Sanitize metadata for AWS S3 headers
  private sanitizeMetadata(metadata?: Record<string, string>): Record<string, string> | undefined {
    if (!metadata) return undefined;
    
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Sanitize key: only lowercase letters, numbers, and hyphens
      const sanitizedKey = key
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Sanitize value: only allow US-ASCII characters for AWS S3 metadata
      const sanitizedValue = value
        .replace(/[\x00-\x1f\x7f-\xff]/g, '') // Remove control characters and non-ASCII
        .replace(/[★☆✓✔✕✖]/g, '') // Remove common Unicode symbols
        .replace(/[^\x20-\x7E]/g, '') // Only allow printable ASCII characters
        .trim();
      
      if (sanitizedKey && sanitizedValue) {
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }
    
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  // Upload audio file with specific naming convention
  public async uploadAudio(
    audioBuffer: Buffer,
    userId: string,
    type: 'generated' | 'extracted' | 'uploaded',
    format: string = 'mp3',
    metadata?: Record<string, string>
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `audio/${type}/${userId}/${timestamp}.${format}`;
    
    return this.uploadFile(key, audioBuffer, `audio/${format}`, {
      userId,
      type,
      uploadedAt: new Date().toISOString(),
      ...metadata,
    });
  }

  // Upload video file
  public async uploadVideo(
    videoBuffer: Buffer,
    userId: string,
    originalName: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = originalName.split('.').pop() || 'mp4';
    const key = `videos/${userId}/${timestamp}-${originalName}`;
    
    return this.uploadFile(key, videoBuffer, `video/${extension}`, {
      userId,
      originalName,
      uploadedAt: new Date().toISOString(),
      ...metadata,
    });
  }

  // Download file from S3
  public async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content received');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.transformToWebStream().getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('[AWSS3Service] Download failed:', error);
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  // Delete file from S3
  public async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`[AWSS3Service] File deleted: ${key}`);
    } catch (error) {
      console.error('[AWSS3Service] Delete failed:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  // Check if file exists
  public async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  // Get file metadata
  public async getFileMetadata(key: string): Promise<Record<string, string | number | Date | undefined> | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
        etag: response.ETag,
      };
    } catch (error) {
      console.error('[AWSS3Service] Get metadata failed:', error);
      return null;
    }
  }

  // Generate presigned URL for direct upload (optional for future use)
  public async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // This would require additional AWS SDK methods
    // For now, return a placeholder
    console.log(`[AWSS3Service] Generating presigned URL for ${key} (expires in ${expiresIn}s)`);
    return `presigned-url-for-${key}`;
  }

  // Get service info
  public getServiceInfo() {
    return {
      bucket: this.bucket,
      region: this.region,
      environment: configManager.getEnvironment(),
    };
  }
}

// Export singleton instance
export const s3Service = AWSS3Service.getInstance(); 