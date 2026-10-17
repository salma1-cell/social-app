import { useEffect, useState, type ChangeEvent } from "react";
import { getMyProfile, uploadProfilePhoto, changePassword, getBookmarks } from "../services/user";
import { getHomeFeed } from "../services/posts";
 
interface ProfileProps {
  onBack: () => void;
  onOpenNotifications?: () => void;
  onSelectPost?: (postId: string) => void;
}
 
const PLACEHOLDER_PHOTO = "https://placehold.co/150x150?text=User";
 
function getSafePhotoUrl(userPhoto?: string, isCurrentUser: boolean = false): string {
  if (isCurrentUser) {
    const customPhoto = localStorage.getItem("custom_profile_photo");
    if (customPhoto && !customPhoto.startsWith("blob:")) {
      return customPhoto;
    }
  }
 
  if (!userPhoto || userPhoto.includes("null") || userPhoto.includes("undefined")) {
    return PLACEHOLDER_PHOTO;
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
 
/**
 * The API may return the user in several shapes:
 *   { data: { user: {...} } }, { user: {...} }, { data: {...} }, or the user directly.
 * Walk through them and return the first object that actually looks like a user.
 */
function extractUser(payload: any): any {
  const candidates = [
    payload?.data?.user,
    payload?.user,
    payload?.data?.data,
    payload?.data,
    payload,
  ];
 
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "object" &&
      (candidate.name || candidate.email || candidate.username || candidate._id || candidate.id)
    ) {
      return candidate;
    }
  }
  return null;
}
 
export default function Profile({ onBack, onOpenNotifications, onSelectPost }: ProfileProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string>(PLACEHOLDER_PHOTO);
  const [activeTab, setActiveTab] = useState<"my-posts" | "saved">("my-posts");
 
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
 
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ password: "", newPassword: "" });
  const [changingPass, setChangingPass] = useState(false);
 
  async function loadProfileData() {
    setLoading(true);
    setLoadError("");
    try {
      const [profileRes, feedRes, bookmarksRes] = await Promise.allSettled([
        getMyProfile(),
        getHomeFeed(100),
        getBookmarks(),
      ]);
 
      // --- DEBUG: remove these logs once everything works ---
      console.log("profileRes:", profileRes);
      if (profileRes.status === "rejected") {
        console.error("Profile request failed:", profileRes.reason);
      }
      if (feedRes.status === "rejected") {
        console.error("Feed request failed:", feedRes.reason);
      }
      if (bookmarksRes.status === "rejected") {
        console.error("Bookmarks request failed:", bookmarksRes.reason);
      }
      // -------------------------------------------------------
 
      let userData: any = null;
 
      if (profileRes.status === "fulfilled") {
        userData = extractUser(profileRes.value);
        console.log("userData:", userData);
 
        if (userData) {
          setUser(userData);
          setCurrentPhoto(getSafePhotoUrl(userData?.photo || userData?.profilePhoto, true));
        } else {
          setLoadError("The profile response didn't contain user data. Check the console for the raw response.");
        }
      } else {
        const reason: any = profileRes.reason;
        setLoadError(
          reason?.message ||
            "Couldn't load your profile. Your session may have expired — try logging in again."
        );
      }
 
      const currentUserId = String(userData?._id || userData?.id || "").trim();
      const currentUserEmail = String(userData?.email || "").trim().toLowerCase();
      const currentUsername = String(userData?.username || "").trim().toLowerCase();
 
      if (feedRes.status === "fulfilled") {
        const feedValue: any = feedRes.value;
        const feedPayload =
          typeof feedValue === "object" && feedValue !== null
            ? feedValue?.posts ?? feedValue?.data?.posts ?? feedValue?.data ?? feedValue
            : [];
        const feedData = Array.isArray(feedPayload) ? feedPayload : [];
 
        const apiPosts = feedData.filter((post: any) => {
          const postAuthor = post?.user ?? post?.author ?? post?.createdBy;
          const authorId = String(
            typeof postAuthor === "object"
              ? postAuthor?._id ?? postAuthor?.id ?? ""
              : postAuthor ?? ""
          ).trim();
 
          const authorEmail = String(postAuthor?.email || "").trim().toLowerCase();
          const authorUsername = String(postAuthor?.username || "").trim().toLowerCase();
 
          const isIdMatch = Boolean(currentUserId && authorId && currentUserId === authorId);
          const isEmailMatch = Boolean(currentUserEmail && authorEmail && currentUserEmail === authorEmail);
          const isUserMatch = Boolean(currentUsername && authorUsername && currentUsername === authorUsername);
 
          return isIdMatch || isEmailMatch || isUserMatch;
        });
 
        let localCreatedPosts: any[] = [];
        try {
          localCreatedPosts = JSON.parse(localStorage.getItem("my_local_posts") || "[]");
        } catch {
          localCreatedPosts = [];
        }
 
        const combined = [...localCreatedPosts, ...apiPosts];
        const uniquePosts = Array.from(new Map(combined.map((item) => [item._id || item.id, item])).values());
 
        setMyPosts(uniquePosts);
      }
 
      if (bookmarksRes.status === "fulfilled") {
        const bookmarksValue: any = bookmarksRes.value;
        const bookmarksPayload =
          typeof bookmarksValue === "object" && bookmarksValue !== null
            ? bookmarksValue?.bookmarks ??
              bookmarksValue?.data?.bookmarks ??
              bookmarksValue?.posts ??
              bookmarksValue?.data ??
              []
            : [];
        const rawList = Array.isArray(bookmarksPayload) ? bookmarksPayload : [];
        const normalizedList = rawList.map((item: any) => item?.post || item);
        setSavedPosts(normalizedList);
      }
    } catch (error: any) {
      console.error("Profile load error:", error);
      setLoadError(error?.message || "Something went wrong while loading your profile.");
    } finally {
      setLoading(false);
    }
  }
 
  useEffect(() => {
    void loadProfileData();
  }, []);
 
  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
 
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result as string;
 
          setCurrentPhoto(base64Image);
          localStorage.setItem("custom_profile_photo", base64Image);
 
          const formData = new FormData();
          formData.append("photo", file);
          await uploadProfilePhoto(formData);
 
          const newPost = {
            _id: `post-${Date.now()}`,
            user: {
              _id: user?._id || user?.id,
              name: user?.name,
              username: user?.username,
              email: user?.email,
              photo: base64Image,
            },
            body: "Updated profile picture.",
            image: base64Image,
            createdAt: new Date().toISOString(),
          };
 
          let existingLocal: any[] = [];
          try {
            existingLocal = JSON.parse(localStorage.getItem("my_local_posts") || "[]");
          } catch {
            existingLocal = [];
          }
          localStorage.setItem("my_local_posts", JSON.stringify([newPost, ...existingLocal]));
 
          setMyPosts((prev) => [newPost, ...prev]);
        } catch (err) {
          console.error("Upload process error:", err);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Photo upload failed:", error);
      setUploading(false);
    }
  }
 
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPass(true);
    try {
      await changePassword(passwordData);
      alert("Password changed successfully!");
      setShowPasswordModal(false);
      setPasswordData({ password: "", newPassword: "" });
    } catch (error: any) {
      alert(error?.message || "Failed to change password.");
    } finally {
      setChangingPass(false);
    }
  }
 
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5]">
        <p className="font-bold text-slate-500">Loading profile...</p>
      </div>
    );
  }
 
  // Visible error state instead of silently rendering an empty profile
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F0F2F5] p-6 text-center">
        <p className="max-w-md font-bold text-slate-700">
          {loadError || "We couldn't load your profile."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => void loadProfileData()}
            className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition"
          >
            Try again
          </button>
          <button
            onClick={onBack}
            className="cursor-pointer rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-300 transition"
          >
            Back to feed
          </button>
        </div>
      </div>
    );
  }
 
  const displayedPosts = activeTab === "my-posts" ? myPosts : savedPosts;
  const currentUserId = String(user?._id || user?.id || "");
 
  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-12 text-slate-800">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm md:px-8">
        <div onClick={onBack} className="cursor-pointer flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#002B7F] font-black text-white">
            R
          </div>
          <span className="text-xl font-black text-[#002B7F]">Route Posts</span>
        </div>
 
        <nav className="flex items-center rounded-2xl bg-slate-100 p-1 font-bold text-slate-600">
          <button onClick={onBack} className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:text-slate-900 transition">
            🏠 Feed
          </button>
          <button className="cursor-pointer rounded-xl bg-white px-3 py-2 text-sm text-blue-600 shadow-sm">
            👤 Profile
          </button>
          <button onClick={onOpenNotifications || onBack} className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:text-slate-900 transition">
            💬 Notifications
          </button>
        </nav>
 
        <div className="flex items-center gap-2">
          <img
            src={currentPhoto}
            alt={user?.name || "User Profile"}
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER_PHOTO;
            }}
            className="h-9 w-9 rounded-full object-cover border border-slate-200"
          />
          <span className="hidden text-sm font-bold text-slate-900 sm:inline">
            {user?.name || "My Account"}
          </span>
        </div>
      </header>
 
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <div className="relative rounded-t-3xl bg-slate-800 h-44 md:h-56 shadow-sm" />
 
        <div className="relative bg-white px-6 pb-6 pt-16 rounded-b-3xl shadow-sm mb-6">
          <div className="absolute -top-16 left-6 md:left-10 flex items-end">
            <div className="relative h-28 w-28 md:h-36 md:w-36 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-md">
              <img
                src={currentPhoto}
                alt={user?.name || "User"}
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER_PHOTO;
                }}
                className="h-full w-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">
                  Uploading...
                </div>
              )}
            </div>
 
            <label className="cursor-pointer absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#002B7F] text-white shadow-md hover:bg-blue-700 transition">
              📷
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" disabled={uploading} />
            </label>
          </div>
 
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900">{user?.name}</h2>
              {user?.username && (
                <p className="text-sm font-bold text-slate-400">@{user.username}</p>
              )}
 
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                  👤 Route Posts member
                </span>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="cursor-pointer rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  🔑 Change Password
                </button>
              </div>
            </div>
 
            <div className="flex items-center gap-3">
              <div className="min-w-28 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">FOLLOWERS</span>
                <span className="text-2xl font-black text-slate-800">{user?.followers?.length ?? 0}</span>
              </div>
              <div className="min-w-28 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">FOLLOWING</span>
                <span className="text-2xl font-black text-slate-800">{user?.following?.length ?? 0}</span>
              </div>
              <div className="min-w-28 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-center">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">BOOKMARKS</span>
                <span className="text-2xl font-black text-slate-800">{savedPosts.length}</span>
              </div>
            </div>
          </div>
 
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            <div className="md:col-span-2 rounded-2xl bg-slate-50/60 p-5 border border-slate-100">
              <h3 className="font-extrabold text-slate-900 mb-3 text-sm">About</h3>
              <div className="space-y-2 text-xs font-bold text-slate-500">
                {user?.email && <p className="flex items-center gap-2">✉️ {user.email}</p>}
                <p className="flex items-center gap-2">👥 Active on Route Posts</p>
              </div>
            </div>
 
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50/60 p-4 border border-slate-100">
                <span className="block text-[10px] font-black uppercase text-slate-400">MY POSTS</span>
                <span className="text-xl font-black text-slate-800">{myPosts.length}</span>
              </div>
              <div className="rounded-2xl bg-slate-50/60 p-4 border border-slate-100">
                <span className="block text-[10px] font-black uppercase text-slate-400">SAVED POSTS</span>
                <span className="text-xl font-black text-slate-800">{savedPosts.length}</span>
              </div>
            </div>
          </div>
        </div>
 
        <div className="mb-6 flex items-center justify-between rounded-3xl bg-white p-2 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("my-posts")}
              className={`cursor-pointer flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
                activeTab === "my-posts"
                  ? "bg-blue-50 text-blue-600 shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              📄 My Posts
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`cursor-pointer flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
                activeTab === "saved"
                  ? "bg-blue-50 text-blue-600 shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              🔖 Saved
            </button>
          </div>
 
          <span className="mr-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-blue-600">
            {displayedPosts.length}
          </span>
        </div>
 
        {displayedPosts.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center text-sm font-bold text-slate-400 shadow-sm border border-slate-100">
            {activeTab === "my-posts" ? "You haven't posted anything yet." : "No saved posts found."}
          </div>
        ) : (
          <div className="space-y-6">
            {displayedPosts.map((post, idx) => {
              const author = post?.user || post?.author || user;
              const authorId = String(author?._id || author?.id || "");
              const isMe = authorId === currentUserId;
              const authorPhoto = getSafePhotoUrl(author?.photo || author?.profilePhoto, isMe);
 
              return (
                <article key={post._id || idx} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={authorPhoto}
                        alt={author?.name}
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_PHOTO;
                        }}
                        className="h-10 w-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{author?.name || "Unknown user"}</h4>
                        {author?.username && (
                          <p className="text-xs font-semibold text-slate-400">@{author.username}</p>
                        )}
                      </div>
                    </div>
 
                    {onSelectPost && (
                      <button
                        onClick={() => onSelectPost(post._id)}
                        className="cursor-pointer text-xs font-bold text-blue-600 hover:underline"
                      >
                        View details
                      </button>
                    )}
                  </div>
 
                  {post?.body && (
                    <p className="text-sm font-semibold text-slate-800 mb-4">{post.body}</p>
                  )}
 
                  {post?.image && (
                    <img
                      src={getSafePhotoUrl(post.image, false)}
                      alt="Post content"
                      className="w-full max-h-[550px] rounded-2xl object-cover"
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
 
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="cursor-pointer rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600"
              >
                ✕
              </button>
            </div>
 
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.password}
                  onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
 
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
 
              <button
                type="submit"
                disabled={changingPass}
                className="cursor-pointer w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {changingPass ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
 