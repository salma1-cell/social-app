import { useState } from "react";
import  {createPost}  from "../services/posts.ts";

// Define TypeScript interface for the CreatePost component props
interface CreatePostProps {
  onPostCreated: () => void; // Callback function to refresh posts list after creation
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  // State for post text body, selected image file, and loading status
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle form submission to create a new post
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Do nothing if both body text and image are missing
    if (!body && !image) return;

    setLoading(true);
    try {
      // Build FormData object to send text and optional file
      const formData = new FormData();
      if (body) formData.append("body", body);
      if (image) formData.append("image", image);

      // Call API service to create the post
      await createPost(formData);
      // Reset form states
      setBody("");
      setImage(null);
      // Trigger parent component callback to refresh data
      onPostCreated();
    } catch (err) {
      // Display error message if creation fails
      alert(err instanceof Error ? err.message : "Error creating post");
    } finally {
      // Reset loading state
      setLoading(false);
    }
  }

  return (
    // Main container wrapper with Tailwind CSS styling
    <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Textarea for typing the post content */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full resize-none rounded-xl bg-slate-50 p-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          rows={3}
        />

        {/* Container for file input and submit button */}
        <div className="flex items-center justify-between">
          {/* File input for uploading an image */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />

          {/* Submit button with dynamic loading state text */}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-900 px-6 py-2.5 font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}