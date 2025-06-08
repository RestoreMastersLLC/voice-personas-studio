import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { configManager } from '@/config/app';
import * as schema from './schema';

// Database connection singleton
class DatabaseService {
  private static instance: DatabaseService;
  private db!: ReturnType<typeof drizzle>;
  private isInitialized = false;

  private constructor() {
    this.initializeConnection();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeConnection(): void {
    if (this.isInitialized) return;

    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('[DatabaseService] DATABASE_URL is not defined');
      throw new Error('DATABASE_URL environment variable is required');
    }

    try {
      // Create Neon HTTP client
      const sql = neon(databaseUrl);
      
      // Initialize Drizzle with schema
      this.db = drizzle(sql, { 
        schema,
        logger: configManager.isDevelopment() 
      });

      this.isInitialized = true;
      console.log(`[DatabaseService] Connected to Neon database (${configManager.getEnvironment()})`);
    } catch (error) {
      console.error('[DatabaseService] Failed to connect to database:', error);
      throw error;
    }
  }

  public getDb() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      // Simple query to check connection
      await this.db.execute('SELECT 1');
      return true;
    } catch (error) {
      console.error('[DatabaseService] Health check failed:', error);
      return false;
    }
  }

  // Get connection info
  public getConnectionInfo() {
    return {
      isInitialized: this.isInitialized,
      environment: configManager.getEnvironment(),
      isDevelopment: configManager.isDevelopment(),
      isProduction: configManager.isProduction(),
    };
  }

  // Migration utilities (for development)
  public async createTables(): Promise<void> {
    if (!configManager.isDevelopment()) {
      throw new Error('Table creation is only allowed in development environment');
    }

    try {
      console.log('[DatabaseService] Creating tables...');
      
      // Note: In production, use proper migration system with drizzle-kit
      // This is a simplified version for development
      
      // The actual table creation would be handled by migrations
      // For now, we'll just log that tables should be created via migrations
      console.log('[DatabaseService] Use "npm run db:migrate" to create tables');
      
    } catch (error) {
      console.error('[DatabaseService] Error creating tables:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dbService = DatabaseService.getInstance();
export const db = dbService.getDb();

// Export schema for use in other parts of the application
export { schema }; 