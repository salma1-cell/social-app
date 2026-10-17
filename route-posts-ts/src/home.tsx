import { useEffect, useState, type FormEvent } from "react";
import EmojiPicker from "emoji-picker-react";

import {
  getHomeFeed,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  toggleBookmarkPost,
  sharePost,
} from "./services/posts";

import {
  getMyProfile,
  getFollowSuggestions,
  toggleFollowUser,
  getUnreadCount,
  getBookmarks,
} from "./services/user";

import CommentsModal from "./components/CommentsModal";
import NotificationsModal from "./components/NotificationsModal";
import Profile from "./components/Profile";
import BookmarksModal from "./components/BookMarksModal";
import SinglePostModal from "./components/SinglePostModal";

interface HomeProps {
  onLogout: () => void;
}

type AnyObject = Record<string, any>;

function getSafePhotoUrl(userPhoto?: string, isCurrentUser: boolean = false): string {
  if (isCurrentUser) {
    const customPhoto = localStorage.getItem("custom_profile_photo");
    if (customPhoto && !customPhoto.startsWith("blob:")) {
      return customPhoto;
    }
  }

  if (!userPhoto || userPhoto.includes("null") || userPhoto.includes("undefined")) {
    return "https://placehold.co/120x120?text=User";
  }

  if (
    userPhoto.startsWith("data:image") ||
    userPhoto.startsWith("http://") ||
    userPhoto.startsWith("https://")
  ) {
    return userPhoto;
  }

  const cleanPath = userPhoto.startsWith("/") ? userPhoto : `/${userPhoto}`;
  return `https://route-posts.routemisr.com${cleanPath}`;
}

function logUserActivity(type: string, description: string) {
  const existing = JSON.parse(localStorage.getItem("user_activities") || "[]");
  const newActivity = {
    id: `act-${Date.now()}`,
    type,
    description,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem("user_activities", JSON.stringify([newActivity, ...existing]));
}

function extractArray(response: any, keys: string[]): AnyObject[] {
  const queue: any[] = [response];
  const visited = new Set<any>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) return current;

    for (const key of keys) {
      if (Array.isArray(current[key])) return current[key];
    }

    for (const key of ["data", "result", "payload", "feed", "bookmarks"]) {
      if (current[key] && typeof current[key] === "object") {
        queue.push(current[key]);
      }
    }
  }

  return [];
}

function extractUser(response: any): AnyObject | null {
  let current = response;
  for (let i = 0; i < 5 && current; i++) {
    if (current.user && typeof current.user === "object") return current.user;
    if (current._id || current.id || current.username || current.email) return current;
    current = current.data ?? current.result;
  }
  return null;
}

function getPostId(post: AnyObject): string {
  return String(post?._id ?? post?.id ?? "");
}

function getAuthor(post: AnyObject): AnyObject {
  return post?.user ?? post?.author ?? post?.createdBy ?? {};
}

function getBody(post: AnyObject): string {
  return post?.body ?? post?.content ?? post?.text ?? "";
}

function getImage(post: AnyObject): string {
  const image = post?.image ?? post?.photo ?? post?.imageUrl ?? post?.imageURL;
  if (typeof image === "string" && image.trim() !== "" && !image.includes("undefined")) {
    if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:image")) {
      return image;
    }
    const cleanPath = image.startsWith("/") ? image : `/${image}`;
    return `https://route-posts.routemisr.com${cleanPath}`;
  }
  if (typeof image?.url === "string") return image.url;
  return "";
}

function getCount(value: any): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number") return value;
  if (value && typeof value === "object") return value.count ?? value.total ?? 0;
  return 0;
}

function formatDate(post: AnyObject): string {
  const value = post?.createdAt ?? post?.created_at ?? post?.updatedAt;
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function Home({ onLogout }: HomeProps) {
  const [currentUser, setCurrentUser] = useState<AnyObject | null>(null);
  const [posts, setPosts] = useState<AnyObject[]>([]);
  const [savedPosts, setSavedPosts] = useState<AnyObject[]>([]);
  const [suggestions, setSuggestions] = useState<AnyObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [postBody, setPostBody] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [privacy, setPrivacy] = useState<"public" | "private" | "only_me">("public");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const [activeTab, setActiveTab] = useState<"feed" | "my-posts" | "community" | "saved">("feed");
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [singlePostId, setSinglePostId] = useState<string | null>(null);

  async function fetchUnreadCount() {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }

  async function loadFeed() {
    try {
      const response = await getHomeFeed();
      const fetchedPosts = extractArray(response, ["posts", "feed", "items"]);
      setPosts(fetchedPosts);
    } catch (error) {
      console.error("Feed error:", error);
    }
  }

  async function loadSavedPosts() {
    try {
      const response = await getBookmarks();
      const rawList = extractArray(response, ["bookmarks", "posts", "saved"]);
      const normalizedList = rawList.map((item: any) => item?.post || item);
      setSavedPosts(normalizedList);
    } catch (err) {
      console.warn("Saved posts fetch issue:", err);
      setSavedPosts([]);
    }
  }

  async function initData() {
    setLoading(true);
    try {
      const [profileRes, feedRes, suggestionsRes] = await Promise.allSettled([
        getMyProfile(),
        getHomeFeed(),
        getFollowSuggestions(),
      ]);

      if (profileRes.status === "fulfilled") setCurrentUser(extractUser(profileRes.value));
      if (feedRes.status === "fulfilled") {
        setPosts(extractArray(feedRes.value, ["posts", "feed", "items"]));
      }
      if (suggestionsRes.status === "fulfilled") {
        setSuggestions(extractArray(suggestionsRes.value, ["users", "suggestions", "suggestedUsers", "items"]));
      }
      await fetchUnreadCount();
      await loadSavedPosts();
    } catch (error) {
      console.error("Home initialization error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void initData();
  }, []);

  useEffect(() => {
    if (activeTab === "saved") {
      void loadSavedPosts();
    }
  }, [activeTab]);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!postBody.trim() && !postImage) return;

    setPosting(true);
    try {
      const formData = new FormData();
      if (postBody.trim()) formData.append("body", postBody.trim());
      if (postImage) formData.append("image", postImage);

      await createPost(formData);
      logUserActivity("post_create", `Created a new post: "${postBody.slice(0, 20)}..."`);
      setPostBody("");
      setPostImage(null);
      setShowEmojiPicker(false);
      await loadFeed();
    } catch (error) {
      alert("Failed to create post.");
    } finally {
      setPosting(false);
    }
  }

  async function handleUpdatePost(postId: string) {
    if (!editingText.trim()) return;
    try {
      await updatePost(postId, editingText.trim());
      logUserActivity("post_update", "Updated a post");
      setEditingPostId(null);
      await loadFeed();
    } catch (error) {
      alert("Failed to update post.");
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(postId);
      logUserActivity("post_delete", "Deleted a post");
      await loadFeed();
    } catch (error) {
      alert("Failed to delete post.");
    }
  }

  async function handleLike(postId: string) {
    if (!postId) return;
    try {
      await toggleLikePost(postId);
      logUserActivity("like", "Liked a post");
      await loadFeed();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleBookmark(postId: string) {
    if (!postId) return;
    try {
      await toggleBookmarkPost(postId);
      logUserActivity("bookmark", "Saved/Unsaved a post");
      await loadSavedPosts();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleShare(postId: string) {
    if (!postId) return;
    try {
      await sharePost(postId);
      logUserActivity("share", "Shared a post");
      alert("Post shared successfully!");
      await loadFeed();
    } catch (error: any) {
      alert(error?.message || "Failed to share post.");
    }
  }

  async function handleFollow(userId: string) {
    if (!userId || userId.trim() === "") return;
    try {
      await toggleFollowUser(userId);
      logUserActivity("follow", "Updated follow status");

      setSuggestions((prev) =>
        prev.map((user) => {
          const uId = String(user?._id ?? user?.id ?? "");
          if (uId === userId) {
            return { ...user, isFollowing: !user.isFollowing };
          }
          return user;
        })
      );
    } catch (error) {
      console.error("Follow error:", error);
    }
  }

  if (showNotifications) {
    return (
      <NotificationsModal
        onClose={() => setShowNotifications(false)}
        onCountUpdate={() => void fetchUnreadCount()}
      />
    );
  }

  if (showProfile) {
    return (
      <Profile
        onBack={() => setShowProfile(false)}
        onOpenNotifications={() => {
          setShowProfile(false);
          setShowNotifications(true);
        }}
      />
    );
  }

  const currentUserId = String(currentUser?._id ?? currentUser?.id ?? "");

  const visiblePosts =
    activeTab === "saved"
      ? savedPosts
      : activeTab === "my-posts"
      ? posts.filter((post) => {
          const author = getAuthor(post);
          const authorId = String(author?._id ?? author?.id ?? "");
          return currentUserId && authorId ? currentUserId === authorId : false;
        })
      : posts;

  const myProfilePhoto = getSafePhotoUrl(currentUser?.photo, true);

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800">
      {/* Navbar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-8">
        <div
          onClick={() => setActiveTab("feed")}
          className="cursor-pointer flex items-center gap-3 hover:opacity-90 transition"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#002B7F] font-black text-white">
            R
          </div>
          <span className="text-xl font-black text-[#002B7F]">Route Posts</span>
        </div>

        <nav className="flex flex-wrap items-center rounded-2xl bg-slate-100 p-1 font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition ${
              activeTab === "feed" ? "bg-white text-blue-600 shadow-sm" : "hover:text-slate-900"
            }`}
          >
            🏠 Feed
          </button>
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="cursor-pointer rounded-xl px-3 py-2 text-sm transition hover:text-slate-900"
          >
            👤 Profile
          </button>
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="cursor-pointer relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition hover:text-slate-900"
          >
            💬 Notifications
            {unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="cursor-pointer flex items-center gap-3 rounded-2xl p-1.5 transition hover:bg-slate-100"
          >
            <img
              src={myProfilePhoto}
              alt={currentUser?.name ?? "User"}
              className="h-9 w-9 rounded-full object-cover border border-slate-200"
            />
            <span className="hidden text-sm font-bold text-slate-900 sm:inline">
              {currentUser?.name ?? "My Profile"}
            </span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="cursor-pointer rounded-xl bg-slate-100 p-2 text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
        {/* Left Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20 rounded-3xl bg-white p-4 shadow-sm">
            <nav className="space-y-1 font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab("feed")}
                className={`cursor-pointer w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                  activeTab === "feed" ? "bg-[#EEF4FF] text-blue-600" : "hover:bg-slate-50"
                }`}
              >
                📰 Feed
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("my-posts")}
                className={`cursor-pointer w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                  activeTab === "my-posts" ? "bg-[#EEF4FF] text-blue-600" : "hover:bg-slate-50"
                }`}
              >
                ✨ My Posts
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("community")}
                className={`cursor-pointer w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                  activeTab === "community" ? "bg-[#EEF4FF] text-blue-600" : "hover:bg-slate-50"
                }`}
              >
                🌐 Community
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`cursor-pointer w-full rounded-2xl px-4 py-3 text-left text-sm transition flex items-center gap-2 ${
                  activeTab === "saved" ? "bg-[#EEF4FF] text-blue-600" : "hover:bg-slate-50"
                }`}
              >
                🔖 Saved
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Feed Section */}
        <main className="min-w-0 flex-1">
          {activeTab !== "saved" && (
            <div className="relative mb-6 rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <img
                  src={myProfilePhoto}
                  alt={currentUser?.name ?? "User"}
                  className="h-10 w-10 rounded-full object-cover border border-slate-200"
                />
                <div className="relative inline-block">
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as "public" | "private" | "only_me")}
                    className="cursor-pointer rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 outline-none hover:bg-slate-200 transition"
                  >
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Private</option>
                    <option value="only_me">👤 Only Me</option>
                  </select>
                </div>
              </div>

              <form onSubmit={handleCreatePost}>
                <textarea
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder={`What's on your mind, ${currentUser?.name?.split(" ")[0] ?? "there"}?`}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                  rows={3}
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
                    <label className="cursor-pointer flex items-center gap-2 hover:text-blue-600 transition">
                      🖼️ Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPostImage(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className="cursor-pointer hover:text-blue-600 transition"
                    >
                      😊 Emoji
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={posting || (!postBody.trim() && !postImage)}
                    className="cursor-pointer rounded-xl bg-[#6C9BCF] px-6 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition"
                  >
                    {posting ? "Posting..." : "Post ✈️"}
                  </button>
                </div>
              </form>

              {showEmojiPicker && (
                <div className="absolute left-0 top-full z-40 mt-2">
                  <EmojiPicker onEmojiClick={(data) => setPostBody((prev) => prev + data.emoji)} />
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl bg-white py-10 text-center text-slate-500 shadow-sm font-bold">
              Loading posts...
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-3xl bg-white py-12 text-center text-slate-400 shadow-sm font-bold">
              {activeTab === "saved" ? "No saved posts yet." : "No posts available."}
            </div>
          ) : (
            <div className="space-y-6">
              {visiblePosts.map((post, index) => {
                const postId = getPostId(post);
                const author = getAuthor(post);
                const authorId = String(author?._id ?? author?.id ?? "");
                const isMyPost = currentUserId === authorId;
                const isEditing = editingPostId === postId;

                return (
                  <article key={postId || index} className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={getSafePhotoUrl(author?.photo, isMyPost)}
                          alt={author?.name}
                          className="cursor-pointer h-10 w-10 shrink-0 rounded-full object-cover border border-slate-200"
                          onClick={() => postId && setSinglePostId(postId)}
                        />
                        <div className="min-w-0">
                          <h4
                            className="cursor-pointer truncate font-bold text-slate-900 hover:underline"
                            onClick={() => postId && setSinglePostId(postId)}
                          >
                            {author?.name || "User"}
                          </h4>
                          <p className="text-xs text-slate-400">
                            @{author?.username || "user"} · {formatDate(post)} · 🌐 Public
                          </p>

                          {activeTab === "saved" && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                              🔖 Saved
                            </span>
                          )}
                        </div>
                      </div>

                      {isMyPost ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPostId(postId);
                              setEditingText(getBody(post));
                            }}
                            className="cursor-pointer text-xs text-blue-600 hover:underline"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(postId)}
                            className="cursor-pointer text-xs text-red-600 hover:underline"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      ) : (
                        authorId && (
                          <button
                            type="button"
                            onClick={() => handleFollow(authorId)}
                            className="cursor-pointer text-xs font-bold text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition"
                          >
                            + Follow
                          </button>
                        )
                      )}
                    </div>

                    {isEditing ? (
                      <div className="my-2 space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full rounded-xl border border-blue-200 p-3 text-sm outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdatePost(postId)}
                            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPostId(null)}
                            className="cursor-pointer rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      getBody(post) && (
                        <p className="whitespace-pre-line text-slate-800 mb-3">{getBody(post)}</p>
                      )
                    )}

                    {getImage(post) && (
                      <img
                        src={getImage(post)}
                        alt="Attachment"
                        className="cursor-pointer mt-2 max-h-[500px] w-full rounded-2xl object-cover"
                        onClick={() => postId && setSinglePostId(postId)}
                      />
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-slate-500">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleLike(postId)}
                          className="cursor-pointer flex items-center gap-1.5 hover:text-blue-600 transition"
                        >
                          ❤️ Like
                        </button>
                        <span className="text-xs text-slate-400">
                          ({getCount(post?.likes)})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActivePostId(postId)}
                        className="cursor-pointer hover:text-blue-600 transition"
                      >
                        💬 {getCount(post?.comments)} Comments
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBookmark(postId)}
                        className="cursor-pointer hover:text-blue-600 transition text-blue-600"
                      >
                        🔖 Saved
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(postId)}
                        className="cursor-pointer hover:text-blue-600 transition"
                      >
                        🔁 Share
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-20 rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
            <h3 className="mb-4 font-extrabold text-slate-900">👥 Suggested Friends</h3>
            <div className="space-y-4">
              {suggestions.slice(0, 5).map((user, idx) => {
                const userId = String(user?._id ?? user?.id ?? "");
                const isFollowing = user?.isFollowing;

                return (
                  <div key={userId || idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getSafePhotoUrl(user.photo, false)}
                        alt={user.name}
                        className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-400">@{user.username}</p>
                      </div>
                    </div>
                    {userId && (
                      <button
                        type="button"
                        onClick={() => handleFollow(userId)}
                        className={`cursor-pointer shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          isFollowing
                            ? "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        }`}
                      >
                        {isFollowing ? "✓ Following" : "+ Follow"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {activePostId && (
        <CommentsModal
          postId={activePostId}
          onClose={() => setActivePostId(null)}
        />
      )}

      {showBookmarksModal && (
        <BookmarksModal
          onClose={() => setShowBookmarksModal(false)}
        />
      )}

      {singlePostId && (
        <SinglePostModal
          postId={singlePostId}
          onClose={() => setSinglePostId(null)}
        />
      )}
    </div>
  );
}