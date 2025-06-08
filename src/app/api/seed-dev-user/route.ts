import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { DEV_CONSTANTS } from '@/lib/config/dev-constants';

export async function POST() {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      );
    }

    console.log('[Seed API] Creating development user...');
    
    // Create development user (will skip if already exists due to primary key constraint)
    const [devUser] = await db.insert(users).values({
      id: DEV_CONSTANTS.DEV_USER_ID,
      email: 'dev@localhost',
      name: 'Development User',
      subscription: 'pro', // Give dev user pro access for testing
      preferences: {
        theme: 'dark',
        notifications: true
      }
    }).onConflictDoNothing().returning();

    if (devUser) {
      console.log('[Seed API] Development user created:', devUser.email);
      return NextResponse.json({
        success: true,
        message: 'Development user created successfully',
        user: { id: devUser.id, email: devUser.email, name: devUser.name }
      });
    } else {
      console.log('[Seed API] Development user already exists');
      return NextResponse.json({
        success: true,
        message: 'Development user already exists',
        user: { id: DEV_CONSTANTS.DEV_USER_ID, email: 'dev@localhost' }
      });
    }
  } catch (error) {
    console.error('[Seed API] Error creating development user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create development user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 