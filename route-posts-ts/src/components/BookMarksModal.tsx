import { useEffect, useState } from "react";

// Define TypeScript interface for the modal props
interface BookmarksModalProps {
  onClose: () => void; // Function to close the modal when triggered
}

// API function to fetch user's bookmarked posts from the server
export async function getBookmarks() {
  const token = localStorage.getItem("token") || localStorage.getItem("userToken") || "";
  const headers = {
    Authorization: token ? `Bearer ${token}` : "",
    token: token,
  };

  // 1. طلب الـ Bookmarks من مسار المستخدمين الصحيح
  let response = await fetch("https://route-posts.routemisr.com/users/bookmarks", { headers });

  // 2. Fallback لمسار saved-posts في حال عادت بـ 404
  if (!response.ok && response.status === 404) {
    response = await fetch("https://route-posts.routemisr.com/users/saved-posts", { headers });
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch bookmarks");
  }
  return data;
}

// Main BookmarksModal component
export default function BookmarksModal({ onClose }: BookmarksModalProps) {
  // State variables for storing bookmarks list and loading status
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Asynchronous function to load and normalize bookmarks data
  async function loadBookmarks() {
    setLoading(true);
    try {
      const data = await getBookmarks();

      // Handle different API response structures safely
      let rawList: any[] = [];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (Array.isArray(data?.bookmarks)) {
        rawList = data.bookmarks;
      } else if (Array.isArray(data?.data)) {
        rawList = data.data;
      } else if (Array.isArray(data?.result)) {
        rawList = data.result;
      }

      // Normalize the list so it consistently extracts the post object
      const normalizedList = rawList.map((item: any) => item?.post || item);
      setBookmarks(normalizedList);
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      setBookmarks([]); // Fallback to an empty list on error
    } finally {
      setLoading(false); // Hide loading indicator
    }
  }

  // Fetch bookmarks automatically when the component mounts
  useEffect(() => {
    loadBookmarks();
  }, []);

  return (
    <>
      {/* Outer backdrop overlay covering the full screen */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        {/* Modal container box */}
        <div className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-3xl bg-white p-6 shadow-xl">
          {/* Modal header with title and close button */}
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-xl font-bold text-slate-900">
              Saved Posts (Bookmarks)
            </h2>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              ✕
            </button>
          </div>

          {/* Modal body container with scrollable list */}
          <div className="my-4 flex-1 space-y-4 overflow-y-auto">
            {loading ? (
              // Show loading text while fetching data
              <p className="py-8 text-center font-bold text-slate-400">Loading bookmarks...</p>
            ) : bookmarks.length === 0 ? (
              // Show message if no bookmarks are available
              <p className="py-8 text-center font-bold text-slate-400">No saved posts yet.</p>
            ) : (
              // Map through and render each bookmarked post
              bookmarks.map((post) => {
                const postId = post._id || post.id;
                const formattedDate = post.createdAt
                  ? new Date(post.createdAt).toLocaleString()
                  : "";

                return (
                  <div key={postId} className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    {/* Post author info section (Avatar, Name, Date) */}
                    <div className="mb-2 flex items-center gap-3">
                      <img
                        src={post.user?.photo || "https://placehold.co/35?text=U"}
                        alt={post.user?.name || "User"}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {post.user?.name || "Unknown User"}
                        </h4>
                        {formattedDate && (
                          <p className="text-xs text-slate-400">
                            {formattedDate}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Post text content body */}
                    {post.body && (
                      <p className="whitespace-pre-line text-sm font-medium text-slate-800">
                        {post.body}
                      </p>
                    )}

                    {/* Optional post attached image */}
                    {post.image && (
                      <img
                        src={post.image}
                        alt="Bookmark content"
                        className="mt-3 max-h-60 w-full rounded-xl object-cover border border-slate-200"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}