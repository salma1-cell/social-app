// API Base URL configuration for network requests
const BASE_URL = "https://route-posts.routemisr.com";

/**
 * Generic HTTP client utility wrapper around native fetch API.
 * Automatically injects Bearer authentication tokens from localStorage
 * and handles standard JSON response parsing and error propagation.
 *
 * @template T - The expected return type of the API response
 * @param endpoint - The relative API endpoint path (e.g. "/posts")
 * @param options - Standard RequestInit options (method, headers, body, etc.)
 * @returns Parsed response body formatted as type T
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Retrieve user authentication JWT token stored in browser localStorage
  const token = localStorage.getItem("token");

  // Perform HTTP request with merged headers and auth token
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Extract raw text content from response body
  const text = await response.text();
  let result: any;

  // Attempt to parse response as JSON, falling back to a message object if parsing fails
  try {
    result = text ? JSON.parse(text) : undefined;
  } catch {
    result = { message: text };
  }

  // Check HTTP response status and throw error if not in 2xx success range
  if (!response.ok) {
    throw new Error(result?.message || "Request failed.");
  }

  return result as T;
}

/**
 * Toggles the like status (like / unlike) for a target post by ID.
 *
 * @param postId - Unique identifier of the post to like/unlike
 */
export async function togglePostLike(postId: string) {
  return apiRequest(`/posts/${postId}/like`, {
    method: "PUT",
  });
}

/**
 * Toggles the bookmark status (save / unsave) for a target post by ID.
 *
 * @param postId - Unique identifier of the post to bookmark/unbookmark
 */
export async function togglePostBookmark(postId: string) {
  return apiRequest(`/posts/${postId}/bookmark`, {
    method: "PUT",
  });
}