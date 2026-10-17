
const BASE_URL = "https://route-posts.routemisr.com";

function getAuthHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("userToken") ||
    "";

  return {
    "Content-Type": "application/json",
    token,
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function handleResponse(res: Response) {
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }

  return data;
}

// 1. Get home feed
export async function getHomeFeed(limit = 50, page = 1) {
  const res = await fetch(
    `${BASE_URL}/posts?limit=${limit}&page=${page}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse(res);
}

export async function getPosts(limit = 50, page = 1) {
  return getHomeFeed(limit, page);
}

// 2. Get a single post
export async function getSinglePost(postId: string) {
  const res = await fetch(`${BASE_URL}/posts/${postId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// 3. Create a post with optional image
export async function createPost(formData: FormData) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("userToken") ||
    "";

  const res = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      token,
    },
    body: formData,
  });

  return handleResponse(res);
}

// 4. Update a post
export async function updatePost(postId: string, body: string) {
  const res = await fetch(`${BASE_URL}/posts/${postId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ body }),
  });

  return handleResponse(res);
}

// 5. Delete a post
export async function deletePost(postId: string) {
  const res = await fetch(`${BASE_URL}/posts/${postId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}

// 6. Like or unlike a post
export async function toggleLikePost(postId: string) {
  const res = await fetch(`${BASE_URL}/posts/${postId}/like`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}

// 7. Get post likes
export async function getPostLikes(postId: string) {
  const res = await fetch(`${BASE_URL}/posts/${postId}/likes`, {
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}

// 8. Bookmark or unbookmark a post
export async function toggleBookmarkPost(postId: string) {
  const res = await fetch(`${BASE_URL}/posts/${postId}/bookmark`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}

// 9. Share a post
export async function sharePost(postId: string) {
  const res = await fetch(`${BASE_URL}/posts/${postId}/share`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}
