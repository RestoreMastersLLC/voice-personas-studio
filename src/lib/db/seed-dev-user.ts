import { db } from './connection';
import { users } from './schema';
import { DEV_CONSTANTS } from '@/lib/config/dev-constants';

export async function seedDevUser() {
  try {
    console.log('[Seed] Creating development user...');
    
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
      console.log('[Seed] Development user created:', devUser.email);
    } else {
      console.log('[Seed] Development user already exists');
    }
    
    return devUser;
  } catch (error) {
    console.error('[Seed] Error creating development user:', error);
    throw error;
  }
}

// Run seed function if this script is executed directly
if (require.main === module) {
  seedDevUser().then(() => {
    console.log('Seeding completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
} 