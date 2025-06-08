// Development constants for consistent dev environment
export const DEV_CONSTANTS = {
  // Development user ID - a valid UUID for database operations
  // This should be replaced with actual user authentication in production
  DEV_USER_ID: '550e8400-e29b-41d4-a716-446655440000',
  
  // Other development constants can be added here
  DEV_SESSION_ID: 'dev-session-' + Date.now(),
} as const;

// Helper function to get current user ID (dev or production)
export function getCurrentUserId(): string {
  // In development, use the constant UUID
  if (process.env.NODE_ENV === 'development') {
    return DEV_CONSTANTS.DEV_USER_ID;
  }
  
  // In production, this should integrate with your auth system
  // For now, throw an error to indicate auth system needs implementation
  throw new Error('Production user authentication not yet implemented');
} 