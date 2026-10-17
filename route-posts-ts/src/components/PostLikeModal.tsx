import { useState } from "react";
import {toggleLikePost} from "../services/posts";
import {getPostLikes} from "../services/posts";
export function PostCard({ post, currentUserId }: { post: any; currentUserId?: string }) {
  const postId = post?._id || post?.id;

  // 1. States للتحكم في اللايكات والمودال
  const [liked, setLiked] = useState<boolean>(
    post?.likes?.some((user: any) => String(user._id || user.id || user) === String(currentUserId))
  );
  const [likesCount, setLikesCount] = useState<number>(post?.likes?.length || 0);

  // Modal حالة فتح قائمة المعجبين بالبوست
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likersList, setLikersList] = useState<any[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  // 2. دالة التعامل مع الضغط على زرار اللايك نفسي (Toggle Like)
  async function handleToggleLike() {
    const prevLiked = liked;
    const prevCount = likesCount;

    // Optimistic Update
    setLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      await toggleLikePost(postId);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // التراجع لو حصل خطأ
      setLiked(prevLiked);
      setLikesCount(prevCount);
    }
  }

  // 3. دالة جلب قائمة الأشخاص الذين أعجبوا بالبوست عند الضغط على الرقم
  async function handleOpenLikesModal() {
    if (!postId) return;
    setShowLikesModal(true);
    setLoadingLikes(true);

    try {
      // التأكد من جلب اللايكات الخاصة بالبوست وليس الـ Saved Posts!
      const res = await getPostLikes(postId);
      const response = res as unknown as {
        users?: any[];
        data?: any[];
        likes?: any[];
      };
      const list = Array.isArray(res)
        ? res
        : response.users || response.data || response.likes || [];
      setLikersList(list);
    } catch (err) {
      console.error("Failed to fetch post likers:", err);
      setLikersList([]);
    } finally {
      setLoadingLikes(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm mb-4">
      {/* محتوى البوست */}
      <p className="text-sm font-medium text-slate-800 mb-4">{post?.body}</p>

      {/* شريط الإحصائيات والتفاعل */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        {/* زرار اللايك + عدد اللايكات */}
        <div className="flex items-center gap-2">
          {/* 1. زرار اللايك (بيخلي اللون أزرق لما يتكبس) */}
          <button
            onClick={handleToggleLike}
            className={`cursor-pointer flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              liked
                ? "bg-blue-50 text-blue-600 border border-blue-200"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>👍</span>
            <span>{liked ? "Liked" : "Like"}</span>
          </button>

          {/* 2. الضغط على الرقم نفسه بيفتح قائمة المعجبين بالبوست */}
          {likesCount > 0 && (
            <button
              type="button"
              onClick={handleOpenLikesModal} // تم تعديلها لتفتح نافذة اللايكات الصحيحة
              className="cursor-pointer text-xs font-extrabold text-slate-500 hover:text-blue-600 hover:underline"
            >
              {likesCount} {likesCount === 1 ? "like" : "likes"}
            </button>
          )}
        </div>
      </div>

      {/* Modal نافذة عرض الأشخاص المعجبين بالبوست */}
      {showLikesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[70vh] w-full max-w-sm flex-col rounded-3xl bg-white p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h4 className="font-black text-slate-900 text-base">Liked by</h4>
              <button
                onClick={() => setShowLikesModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {loadingLikes ? (
                <p className="text-center text-xs font-bold text-slate-400 py-4">Loading likes...</p>
              ) : likersList.length > 0 ? (
                likersList.map((user: any, idx: number) => (
                  <div key={user?._id || idx} className="flex items-center gap-3">
                    <img
                      src={user?.photo || "https://placehold.co/32?text=U"}
                      alt={user?.name || "User"}
                      className="h-8 w-8 rounded-full object-cover border border-slate-200"
                    />
                    <span className="text-xs font-extrabold text-slate-800">{user?.name || "User"}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs font-bold text-slate-400 py-4">No likes found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}