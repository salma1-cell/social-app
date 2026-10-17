import { useEffect, useState } from "react";
import { getPosts } from "../services/posts";
import CommentsModal from "./CommentsModal";
interface SinglePostModalProps {
  postId: string;
  onClose: () => void;
}

export default function SinglePostModal({ postId, onClose }: SinglePostModalProps) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    async function fetchPostDetails() {
      if (!postId) return;
      setLoading(true);
      try {
        const res = await getPosts(Number(postId));
        // التعامل مع استجابة الـ API سواء كانت مباشرة أو داخل data/post
        const response = res as Record<string, any> | boolean | null;
        const postData =
          response && typeof response === "object"
            ? response.post || response.data || response
            : response;
        setPost(postData);
      } catch (err) {
        console.error("Error fetching single post:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPostDetails();
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-black text-slate-900">Post Details</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-center font-bold text-slate-400 py-8">Loading post...</p>
          ) : post ? (
            <div className="space-y-4">
              {/* Author Info */}
              <div className="flex items-center gap-3">
                <img
                  src={post?.user?.photo || "https://placehold.co/40?text=U"}
                  alt={post?.user?.name || "User"}
                  className="h-10 w-10 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {post?.user?.name || "User"}
                  </h4>
                  <span className="text-xs text-slate-400">
                    {post?.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                  </span>
                </div>
              </div>

              {/* Text Body */}
              {post?.body && (
                <p className="text-sm font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                  {post.body}
                </p>
              )}

              {/* Image Attachment */}
              {post?.image && (
                <img
                  src={post.image}
                  alt="Post content"
                  className="w-full max-h-80 rounded-2xl object-cover border border-slate-100"
                />
              )}

              {/* Comments Button */}
              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button
                  onClick={() => setShowComments(true)}
                  className="cursor-pointer text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition"
                >
                  💬 View Comments
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center font-bold text-slate-400 py-8">Post not found.</p>
          )}
        </div>

      </div>

      {/* Nested Comments Modal */}
      {showComments && postId && (
        <CommentsModal postId={postId} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}