import { getUserDisplayName } from "./store"

/**
 * Gets the display name for a user based on the current user's context
 * If the userId matches currentUserId, returns the real name
 * Otherwise returns the dummy display name (buyer1, seller2, etc.)
 * 
 * @param userId - The ID of the user whose name to display
 * @param currentUserId - The ID of the currently logged-in user
 * @returns The display name to show
 */
export async function getDisplayNameForUser(userId: string, currentUserId: string): Promise<string> {
  return await getUserDisplayName(userId, currentUserId)
}

/**
 * Checks if a user should see another user's real name
 * Returns true only if they are the same user
 * 
 * @param userId - The ID of the user being viewed
 * @param currentUserId - The ID of the currently logged-in user
 * @returns true if the user should see the real name
 */
export function shouldShowRealName(userId: string, currentUserId: string): boolean {
  return userId === currentUserId
}
