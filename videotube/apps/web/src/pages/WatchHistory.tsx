import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchWatchHistory, queryKeys } from "../lib/queries";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import type { Video } from "../types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WatchHistory() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.watchHistory(1),
    queryFn: () => fetchWatchHistory(1, 50),
    enabled: !!user,
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete("/users/watch-history"),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.watchHistory(1), (old: any) =>
        old ? { ...old, docs: [], totalDocs: 0 } : old,
      );
    },
  });

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <History className="w-12 h-12 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">Sign in to see your watch history.</p>
        <Link
          to="/login"
          className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const entries = data?.docs ?? [];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="w-7 h-7 text-gray-600 dark:text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watch History</h1>
        </div>
        {entries.length > 0 && (
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear history
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-40 aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-gray-500 dark:text-gray-400">Failed to load watch history.</p>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p>No watch history yet.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
            Browse videos
          </Link>
        </div>
      )}

      {!isLoading && !isError && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const video: Video | undefined = entry.video;
            if (!video) return null;
            const owner = video.owner;
            return (
              <Link
                key={`${video._id}-${i}`}
                to={`/watch/${video._id}`}
                className="flex gap-3 group p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative w-40 aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No thumbnail
                    </div>
                  )}
                  {video.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {owner?.fullname}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Watched {timeAgo(entry.watchedAt)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
