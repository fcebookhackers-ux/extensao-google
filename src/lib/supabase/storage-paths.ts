/**
 * Helper functions to generate storage paths following security best practices.
 * All paths are organized by user_id to ensure proper RLS isolation.
 */

/**
 * Generates a storage path for media files
 * Format: {userId}/{timestamp}-{fileName}
 */
export const getMediaStoragePath = (
  userId: string,
  fileName: string
): string => {
  const timestamp = Date.now();
  return `${userId}/${timestamp}-${fileName}`;
};

/**
 * Generates a storage path for thumbnail files
 * Format: {userId}/thumbnails/{timestamp}-thumb.jpg
 */
export const getThumbnailStoragePath = (
  userId: string
): string => {
  const timestamp = Date.now();
  return `${userId}/thumbnails/${timestamp}-thumb.jpg`;
};

/**
 * Extracts the user_id from a storage path
 * Returns null if path doesn't follow expected format
 */
export const getUserIdFromPath = (path: string): string | null => {
  const parts = path.split('/');
  return parts.length >= 2 ? parts[0] : null;
};

/**
 * Validates if a storage path belongs to a specific user
 */
export const validatePathOwnership = (
  path: string,
  userId: string
): boolean => {
  const pathUserId = getUserIdFromPath(path);
  return pathUserId === userId;
};
