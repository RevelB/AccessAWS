import { client } from './amplify';

export interface UserPrefs {
  userId: string | null;
  initials?: string | null;
  lastActive?: string | null;
  jobFormServiceHeight?: number | null;
}

/**
 * Get user preferences for a specific user
 */
export async function getUserPrefs(userId: string): Promise<UserPrefs | null> {
  try {
    const { data: userPrefs } = await client.models.UserPrefs.get({ id: userId });
    return userPrefs;
  } catch (error) {
    // User preferences don't exist yet, that's okay
    console.log('No user preferences found for user:', userId);
    return null;
  }
}

/**
 * Update or create user preferences
 */
export async function saveUserPrefs(userId: string, updates: Partial<UserPrefs>): Promise<void> {
  try {
    // Try to update existing preferences
    await client.models.UserPrefs.update({
      id: userId,
      userId,
      ...updates
    });
  } catch (error) {
    // If update fails, try to create new preferences
    try {
      await client.models.UserPrefs.create({
        userId,
        ...updates
      });
    } catch (createError) {
      console.error("Failed to save user preferences:", createError);
      throw createError;
    }
  }
}

/**
 * Update user's last active timestamp
 */
export async function updateLastActive(userId: string): Promise<void> {
  await saveUserPrefs(userId, {
    lastActive: new Date().toISOString()
  });
}

/**
 * Save user's initials
 */
export async function saveInitials(userId: string, initials: string): Promise<void> {
  await saveUserPrefs(userId, { initials });
}

/**
 * Save job form service height preference
 */
export async function saveJobFormServiceHeight(userId: string, height: number): Promise<void> {
  await saveUserPrefs(userId, { jobFormServiceHeight: height });
} 