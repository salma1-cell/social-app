import { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/user";

// Define TypeScript interface for the NotificationsModal props
interface NotificationsProps {
  onClose: () => void;           // Callback function to close the modal / navigate back
  onCountUpdate?: () => void;    // Optional callback to update global unread count
}

// Helper function to format timestamps into relative time strings (e.g., "5m", "2h", "1d")
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "1h";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "1h";

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function NotificationsModal({
  onClose,
  onCountUpdate,
}: NotificationsProps) {
  // State variables for notifications data, loading status, and active filter selection
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");

  // Asynchronous function to fetch notifications from the server and merge local notifications
  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await getNotifications();
      let list: any[] = [];

      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.notifications)) list = data.notifications;
      else if (Array.isArray(data?.data)) list = data.data;

      // Merge local notifications stored in localStorage (e.g., custom actions like new image uploads)
      const localNotifs = JSON.parse(localStorage.getItem("local_notifications") || "[]");
      setNotifications([...localNotifs, ...list]);
    } catch (err) {
      console.error(err);
      // Fallback to local notifications if server fetch fails
      const localNotifs = JSON.parse(localStorage.getItem("local_notifications") || "[]");
      setNotifications(localNotifs);
    } finally {
      setLoading(false);
    }
  }

  // Load notifications automatically when the component mounts
  useEffect(() => {
    loadNotifications();
  }, []);

  // Handle marking a single notification as read
  async function handleMarkAsRead(notifId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      await markNotificationAsRead(notifId);
    } catch {
      // Ignore errors if it's a local notification
    }
    // Update local state to reflect that the notification has been read
    setNotifications((prev) =>
      prev.map((n) =>
        (n._id || n.id) === notifId ? { ...n, read: true, isRead: true } : n
      )
    );
    if (onCountUpdate) onCountUpdate();
  }

  // Handle marking all notifications as read simultaneously
  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();
    } catch {
      // Ignore errors
    }
    // Update all items in state to read status
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, isRead: true }))
    );
    if (onCountUpdate) onCountUpdate();
  }

  // Compute unread count and filter notifications based on the active tab
  const unreadCount = notifications.filter((n) => !(n.read || n.isRead)).length;
  const filtered =
    activeFilter === "unread"
      ? notifications.filter((n) => !(n.read || n.isRead))
      : notifications;

  return (
    // Main full-page wrapper container
    <div className="min-h-screen bg-[#F0F2F5] pb-12 text-slate-800">
      
      {/* Top Fixed Header with navigation links and logo */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm md:px-8">
        <div onClick={onClose} className="cursor-pointer flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#002B7F] font-black text-white">
            R
          </div>
          <span className="text-xl font-black text-[#002B7F]">Route Posts</span>
        </div>

        <nav className="flex items-center rounded-2xl bg-slate-100 p-1 font-bold text-slate-600">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:text-slate-900 transition"
          >
            🏠 Feed
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:text-slate-900 transition"
          >
            👤 Profile
          </button>
          <button
            className="cursor-pointer rounded-xl bg-white px-3 py-2 text-sm text-blue-600 shadow-sm"
          >
            💬 Notifications
            {unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>
      </header>

      {/* Main Container Wrapper */}
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200/80 md:p-8">
          
          {/* Header Title Section with 'Mark all as read' action button */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Notifications</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Realtime updates for likes, comments, shares, and follows.
              </p>
            </div>

            <button
              onClick={handleMarkAllAsRead}
              className="cursor-pointer flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              ✓✓ Mark all as read
            </button>
          </div>

          {/* Filter Tab Buttons (All vs Unread) */}
          <div className="my-6 flex items-center gap-3">
            <button
              onClick={() => setActiveFilter("all")}
              className={`cursor-pointer rounded-2xl px-5 py-2 text-sm font-bold transition ${
                activeFilter === "all"
                  ? "bg-[#0066FF] text-white shadow-md shadow-blue-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>

            <button
              onClick={() => setActiveFilter("unread")}
              className={`cursor-pointer flex items-center gap-2 rounded-2xl px-5 py-2 text-sm font-bold transition ${
                activeFilter === "unread"
                  ? "bg-[#0066FF] text-white shadow-md shadow-blue-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-black ${
                    activeFilter === "unread"
                      ? "bg-white text-[#0066FF]"
                      : "bg-[#0066FF] text-white"
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notifications List Section */}
          <div className="space-y-3">
            {loading ? (
              // Loading state message
              <div className="py-16 text-center font-bold text-slate-400">
                Loading notifications...
              </div>
            ) : filtered.length === 0 ? (
              // Empty state message when no notifications match criteria
              <div className="py-16 text-center font-bold text-slate-400">
                No notifications found.
              </div>
            ) : (
              // Map through filtered notifications and render each card
              filtered.map((notif, index) => {
                const notifId = notif?._id || notif?.id || `notif-${index}`;
                const sender = notif?.sender || notif?.user || {};
                const senderName = sender?.name || notif?.title || "User";
                const isUnread = !(notif?.read || notif?.isRead);
                const type = notif?.type || "like";

                return (
                  <div
                    key={notifId}
                    onClick={(e) => isUnread && handleMarkAsRead(notifId, e)}
                    className={`cursor-pointer flex items-center justify-between gap-4 rounded-2xl p-4 transition ${
                      isUnread
                        ? "bg-[#EEF4FF] border border-blue-100"
                        : "bg-white border border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    {/* Left side: Sender Avatar, badge icon, and notification text */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={sender?.photo || "https://placehold.co/48"}
                          alt={senderName}
                          className="h-12 w-12 rounded-full object-cover border border-slate-200"
                        />
                        {/* Notification type icon indicator badge */}
                        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 text-xs">
                          {type === "share" && <span className="text-emerald-500 font-bold">🔄</span>}
                          {type === "like" && <span className="text-red-500">❤️</span>}
                          {type === "follow" && <span className="text-blue-500">👤</span>}
                          {type === "profile_photo" && <span>📷</span>}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-snug">
                          {senderName}{" "}
                          <span className="font-normal text-slate-700">
                            {type === "share" && "shared your post"}
                            {type === "like" && "liked your post"}
                            {type === "follow" && "followed you"}
                            {type === "profile_photo" && "updated profile picture."}
                          </span>
                        </p>

                        {/* Individual "Mark as read" button visible on unread notifications */}
                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(notifId, e)}
                            className="cursor-pointer mt-2 flex items-center gap-1.5 rounded-lg bg-white border border-blue-200 px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 transition"
                          >
                            ✓ Mark as read
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right side: Relative time badge and blue unread dot */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-slate-400">
                        {formatRelativeTime(notif?.createdAt)}
                      </span>
                      {isUnread && (
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}