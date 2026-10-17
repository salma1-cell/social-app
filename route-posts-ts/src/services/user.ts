
// API Base URL configuration for user accounts, profile services, and notifications
const BASE_URL = "https://route-posts.routemisr.com";

/**
 * Utility helper to build authentication headers.
 * Checks localStorage for standard token key variants (`token` or `userToken`)
 * and returns the formatted Bearer Authorization header object.
 */
function getAuthHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("userToken") || "";
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
}

/**
 * Fetches profile data for the currently authenticated user.
 * 
 * @returns Parsed JSON response containing profile information
 */
export async function getMyProfile() {
  const response = await fetch(`${BASE_URL}/users/profile-data`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch profile");
  return data;
}

// Alias export for getMyProfile
export const getProfile = getMyProfile;

/**
 * Fetches public profile information for a target user by ID.
 * 
 * @param userId - Unique identifier of the target user
 * @returns Parsed JSON response with user profile data
 */
export async function getUserProfile(userId: string) {
  const response = await fetch(`${BASE_URL}/users/${userId}/profile`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch user profile");
  return data;
}

/**
 * Fetches all posts authored by a specific user ID.
 * 
 * @param userId - Unique identifier of the target user
 * @returns Parsed JSON response containing list of user posts
 */
export async function getUserPosts(userId: string) {
  const response = await fetch(`${BASE_URL}/users/${userId}/posts`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch user posts");
  return data;
}

/**
 * Fetches suggested users to follow.
 * 
 * @param limit - Maximum number of suggestions to retrieve (defaults to 10)
 * @returns Parsed JSON response with suggested user accounts
 */
export async function getFollowSuggestions(limit = 10) {
  const response = await fetch(`${BASE_URL}/users/suggestions?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch follow suggestions");
  return data;
}

/**
 * Toggles follow / unfollow status for a target user.
 * 
 * @param userId - Unique identifier of the user to follow or unfollow
 * @returns Parsed JSON response confirming updated relationship status
 */
export async function toggleFollowUser(userId: string) {
  if (!userId) throw new Error("User ID is required to follow/unfollow.");

  const token = localStorage.getItem("token") ?? "";

  const res = await fetch(`https://route-posts.routemisr.com/users/${userId}/follow`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Failed to update follow status.");
  }
  return data;
}

// Alias export for toggleFollowUser
export const followUser = toggleFollowUser;

/**
 * Uploads a new profile picture for the authenticated user.
 * 
 * @param formData - FormData payload containing the uploaded photo file
 * @returns Parsed JSON response with updated photo URL details
 */
export async function uploadProfilePhoto(formData: FormData) {
  const response = await fetch(`${BASE_URL}/users/upload-photo`, {
    method: "PUT",
    headers: getAuthHeaders(), // FormData auto-generates multipart/form-data boundary
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to upload profile photo");
  return data;
}

/**
 * Updates the authenticated user's current password.
 * 
 * @param passwordData - Payload containing existing password and new password
 * @returns Parsed JSON response confirming password modification
 */
export async function changePassword(passwordData: { password?: string; newPassword?: string }) {
  const response = await fetch(`${BASE_URL}/users/change-password`, {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(passwordData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to change password");
  return data;
}

/**
 * Fetches saved/bookmarked posts for the current user.
 * Executes a fallback request to `/users/saved-posts` if the primary endpoint returns HTTP 404.
 * 
 * @returns Parsed JSON response containing bookmarked posts
 */
export async function getBookmarks() {
  const token = localStorage.getItem("token") || localStorage.getItem("userToken") || "";
  const headers = {
    Authorization: token ? `Bearer ${token}` : "",
    token: token,
  };

  // 1. Primary endpoint request for user bookmarks
  let response = await fetch("https://route-posts.routemisr.com/users/bookmarks", { headers });
  
  // 2. Fallback request to /saved-posts if primary endpoint returns 404 Not Found
  if (!response.ok && response.status === 404) {
    response = await fetch("https://route-posts.routemisr.com/users/saved-posts", { headers });
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch bookmarks");
  }
  return data;
}

/**
 * Fetches a paginated list of notifications for the authenticated user.
 * 
 * @param page - Page number for pagination (defaults to 1)
 * @param limit - Number of notifications per page (defaults to 10)
 * @returns Parsed JSON response containing notifications list
 */
export async function getNotifications(page = 1, limit = 10) {
  const response = await fetch(`${BASE_URL}/notifications?unread=false&page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch notifications");
  return data;
}

/**
 * Retrieves total unread notifications count for the authenticated user.
 * 
 * @returns Parsed JSON response containing unread notifications count
 */
export async function getUnreadCount() {
  const response = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch unread count");
  return data;
}

/**
 * Marks a specific notification as read by ID.
 * 
 * @param notificationId - Unique identifier of the notification to update
 * @returns Parsed JSON response with updated notification state
 */
export async function markNotificationAsRead(notificationId: string) {
  const response = await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to mark notification as read");
  return data;
}

/**
 * Marks all notifications as read for the authenticated user.
 * 
 * @returns Parsed JSON response confirming all notifications marked read
 */
export async function markAllNotificationsAsRead() {
  const response = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to mark all notifications as read");
  return data;
}

