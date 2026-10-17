import { useEffect, useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { getPostComments, createComment } from "../services/comments";

interface CommentsModalProps {
  postId: string;
  onClose: () => void;
}

export default function CommentsModal({ postId, onClose }: CommentsModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // جلب التعليقات من السيرفر
  async function fetchComments() {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await getPostComments(postId);
      // فحص واستخراج المصفوفة بغض النظر عن طريقة إرجاع الباك إند لها
      const list = Array.isArray(data)
        ? data
        : data?.comments || data?.data?.comments || data?.data || [];

      setComments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading comments:", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // اختيار صورة مع التعليق
  function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  // حذف الصورة المحددة
  function handleRemoveImage() {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // إضافة تعليق جديد ومعالجة الظهور اللحظي
  async function handleAddComment(e: FormEvent) {
    e.preventDefault();

    let trimmedContent = newComment.trim();

    // يمنع الإرسال إذا لم يوجد نص أو صورة
    if (!trimmedContent && !selectedFile) return;

    // معالجة شرط الحرفين للباك إند (at least 2 characters)
    if (selectedFile && !trimmedContent) {
      trimmedContent = "  "; // مسافتين في حال إرسال صورة فقط
    } else if (trimmedContent.length < 2) {
      trimmedContent = trimmedContent + " "; // إضافة مسافة إذا كان النص حرفاً واحداً
    }

    setSubmitting(true);
    try {
      const response = await createComment(postId, trimmedContent, selectedFile || undefined);

      // تفريغ المدخلات فوراً
      setNewComment("");
      handleRemoveImage();

      // 1. استخراج الكومنت المعاد من السيرفر وإضافته فوراً للقائمة
      const createdComment = response?.comment || response?.data || response;
      if (createdComment && typeof createdComment === "object" && !Array.isArray(createdComment)) {
        setComments((prev) => [createdComment, ...prev]);
      }

      // 2. إعادة جلب القائمة الكاملة من السيرفر لمزامنة البيانات
      await fetchComments();
    } catch (err: any) {
      console.error("Failed to add comment:", err);
      alert(err?.message || "Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // Modal Overlay Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      {/* Modal Card */}
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-black text-slate-900">Comments</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Comments Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-8 text-center font-bold text-slate-400">
              Loading comments...
            </div>
          ) : Array.isArray(comments) && comments.length > 0 ? (
            comments.map((comment, index) => {
              // استخراج الكاتب والنص والصورة بمرونة تناسب جميع ردود السيرفر المحتملة
              const author = comment?.commentCreator || comment?.user || comment?.owner || {};
              const textContent = comment?.content || comment?.body || comment?.text;
              const commentImage = comment?.image || comment?.photo;

              return (
                <div
                  key={comment?._id || comment?.id || index}
                  className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100"
                >
                  <img
                    src={author?.photo || "https://placehold.co/40?text=U"}
                    alt={author?.name || "User"}
                    className="h-9 w-9 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex-1 text-xs space-y-1">
                    <h5 className="font-extrabold text-slate-900">
                      {author?.name || "User"}
                    </h5>
                    
                    {textContent && (
                      <p className="font-medium text-slate-700 whitespace-pre-line leading-relaxed">
                        {textContent}
                      </p>
                    )}

                    {commentImage && (
                      <img
                        src={commentImage}
                        alt="Comment attachment"
                        className="mt-2 max-h-48 w-full rounded-xl object-cover border border-slate-200"
                      />
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center font-bold text-slate-400">
              No comments yet. Be the first to comment!
            </div>
          )}
        </div>

        {/* Footer Input Area */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-2">
          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Selected preview"
                className="h-20 w-20 rounded-xl object-cover border border-slate-200"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <label className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
              📷
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500 font-medium"
            />

            <button
              type="submit"
              disabled={submitting || (!newComment.trim() && !selectedFile)}
              className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}