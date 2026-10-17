// API Base URL configuration
const BASE_URL = "https://route-posts.routemisr.com";

/**
 * Helper to build JSON request auth headers.
 */
function getAuthHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("userToken") || "";
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

/**
 * Helper to build FormData request auth headers.
 * Omits Content-Type so browser auto-sets multipart boundary.
 */
function getFormDataHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("userToken") || "";
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// ============================================================================
// 1. POST COMMENTS ENDPOINTS
// ============================================================================

/**
 * ACTION: Fetch paginated comments for a post
 * ENDPOINTS:
 *   - GET /posts/{postId}/comments?page={page}&limit={limit}
 *   - GET /comments?post={postId}&page={page}&limit={limit} (Fallback)
 */
export async function getPostComments(postId: string, page = 1, limit = 10) {
  if (!postId) throw new Error("postId is required to fetch comments");

  let response = await fetch(
    `${BASE_URL}/posts/${postId}/comments?page=${page}&limit=${limit}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok && response.status === 404) {
    response = await fetch(
      `${BASE_URL}/comments?post=${postId}&page=${page}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch comments");
  return data;
}

/**
 * ACTION: Add a new comment to a post (with optional image)
 * ENDPOINTS:
 *   - POST /posts/{postId}/comments
 *   - POST /comments (Fallback with JSON payload)
 */
export async function createComment(postId: string, content: string, imageFile?: File) {
  if (!postId) throw new Error("postId is required to create a comment");

  const formData = new FormData();
  formData.append("content", content);
  if (imageFile) formData.append("image", imageFile);

  let response = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
    method: "POST",
    headers: getFormDataHeaders(),
    body: formData,
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`${BASE_URL}/comments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, post: postId }),
    });
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to add comment");
  return data;
}

/**
 * ACTION: Update existing comment text and/or attached image
 */
export async function updateComment(
  postId: string,
  commentId: string,
  content: string,
  imageFile?: File
) {
  if (!commentId) throw new Error("commentId is required to update a comment");

  const formData = new FormData();
  formData.append("content", content);
  if (imageFile) formData.append("image", imageFile);

  const targetUrl = postId
    ? `${BASE_URL}/posts/${postId}/comments/${commentId}`
    : `${BASE_URL}/comments/${commentId}`;

  let response = await fetch(targetUrl, {
    method: "PUT",
    headers: getFormDataHeaders(),
    body: formData,
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`${BASE_URL}/comments/${commentId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update comment");
  return data;
}

/**
 * ACTION: Delete a comment from a post
 */
export async function deleteComment(postId: string, commentId: string) {
  if (!commentId) throw new Error("commentId is required to delete a comment");

  const targetUrl = postId
    ? `${BASE_URL}/posts/${postId}/comments/${commentId}`
    : `${BASE_URL}/comments/${commentId}`;

  let response = await fetch(targetUrl, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`${BASE_URL}/comments/${commentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to delete comment");
  return data;
}

/**
 * ACTION: Like or unlike a comment
 */
export async function toggleLikeComment(postId: string, commentId: string) {
  if (!commentId) throw new Error("commentId is required to like a comment");

  const targetUrl = postId
    ? `${BASE_URL}/posts/${postId}/comments/${commentId}/like`
    : `${BASE_URL}/comments/${commentId}/like`;

  let response = await fetch(targetUrl, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`${BASE_URL}/comments/${commentId}/like`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to like comment");
  return data;
}

// ============================================================================
// 2. COMMENT REPLIES ENDPOINTS
// ============================================================================

/**
 * ACTION: Fetch paginated replies for a parent comment
 */
export async function getCommentReplies(
  postId: string,
  commentId: string,
  page = 1,
  limit = 10
) {
  if (!commentId) throw new Error("commentId is required to fetch replies");

  const targetUrl = postId
    ? `${BASE_URL}/posts/${postId}/comments/${commentId}/replies?page=${page}&limit=${limit}`
    : `${BASE_URL}/comments/${commentId}/replies?page=${page}&limit=${limit}`;

  let response = await fetch(targetUrl, {
    headers: getAuthHeaders(),
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(
      `${BASE_URL}/comments/${commentId}/replies?page=${page}&limit=${limit}`,
      { headers: getAuthHeaders() }
    );
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch replies");
  return data;
}

/**
 * ACTION: Add a nested reply under a comment
 */
export async function createReply(
  postId: string,
  commentId: string,
  content: string,
  imageFile?: File
) {
  if (!commentId) throw new Error("commentId is required to create a reply");

  const formData = new FormData();
  formData.append("content", content);
  if (imageFile) formData.append("image", imageFile);

  const targetUrl = postId
    ? `${BASE_URL}/posts/${postId}/comments/${commentId}/replies`
    : `${BASE_URL}/comments/${commentId}/replies`;

  let response = await fetch(targetUrl, {
    method: "POST",
    headers: getFormDataHeaders(),
    body: formData,
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`${BASE_URL}/comments/${commentId}/replies`, {
      method: "POST",
      headers: getFormDataHeaders(),
      body: formData,
    });
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to add reply");
  return data;
}