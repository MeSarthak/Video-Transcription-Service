import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Trash2, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchUserPlaylists,
  fetchPlaylistById,
  createPlaylist,
  removeVideoFromPlaylist,
  queryKeys,
} from "../lib/queries";
import { useAuth } from "../context/AuthContext";
import { SkeletonRelatedRow } from "../components/ui/Skeleton";
import type { Video } from "../types";

const WATCH_LATER_NAME = "Watch Later";

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function WatchLater() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?._id ?? "";

  // Step 1: fetch the user's playlists to find (or confirm absence of) "Watch Later"
  const {
    data: playlists,
    isLoading: playlistsLoading,
  } = useQuery({
    queryKey: queryKeys.userPlaylists(userId),
    queryFn: () => fetchUserPlaylists(userId),
    enabled: !!userId,
  });

  const watchLaterSummary = playlists?.find(
    (p) => p.name.toLowerCase() === WATCH_LATER_NAME.toLowerCase(),
  ) ?? null;

  // Step 2: once we know the playlist id, fetch its full contents (with populated videos)
  const {
    data: watchLaterPlaylist,
    isLoading: playlistLoading,
  } = useQuery({
    queryKey: queryKeys.playlist(watchLaterSummary?._id ?? ""),
    queryFn: () => fetchPlaylistById(watchLaterSummary!._id),
    enabled: !!watchLaterSummary?._id,
  });

  // Create the "Watch Later" playlist
  const createMutation = useMutation({
    mutationFn: () =>
      createPlaylist(WATCH_LATER_NAME, "Videos saved to watch later"),
    onSuccess: (newPlaylist) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.userPlaylists(userId),
      });
      queryClient.setQueryData(queryKeys.playlist(newPlaylist._id), newPlaylist);
    },
  });

  // Remove a video from the playlist
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removeMutation = useMutation({
    mutationFn: ({ videoId, playlistId }: { videoId: string; playlistId: string }) =>
      removeVideoFromPlaylist(videoId, playlistId),
    onMutate: ({ videoId }) => setRemovingId(videoId),
    onSuccess: (updated, { playlistId }) => {
      queryClient.setQueryData(queryKeys.playlist(playlistId), updated);
    },
    onSettled: () => setRemovingId(null),
  });

  // ── Auth guard ──────────────────────────────
  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Clock className="w-12 h-12 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to save videos to Watch Later.
        </p>
        <Link
          to="/login"
          className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const isLoading = playlistsLoading || (!!watchLaterSummary && playlistLoading);
  const videos: Video[] = (watchLaterPlaylist?.videos ?? []) as Video[];

  // ── Loading skeleton ────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-7 h-7 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watch Later</h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRelatedRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── No playlist yet ─────────────────────────
  if (!watchLaterSummary) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-7 h-7 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watch Later</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            You don't have a Watch Later playlist yet.
          </p>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Watch Later playlist
          </button>
          {createMutation.isError && (
            <p className="text-sm text-red-500">Failed to create playlist. Please try again.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Empty playlist ──────────────────────────
  if (videos.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-7 h-7 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watch Later</h1>
        </div>
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p>No videos saved yet.</p>
          <Link
            to="/"
            className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
          >
            Browse videos
          </Link>
        </div>
      </div>
    );
  }

  // ── Video list ──────────────────────────────
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-7 h-7 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watch Later</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">{videos.length} videos</span>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {videos.map((video, i) => (
            <motion.div
              key={video._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(i * 0.03, 0.3) }}
              className="flex gap-3 group p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {/* Thumbnail */}
              <Link
                to={`/watch/${video._id}`}
                className="relative w-40 aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 block"
              >
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
              </Link>

              {/* Meta */}
              <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/watch/${video._id}`}>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 hover:underline">
                      {video.title}
                    </h3>
                  </Link>
                  {video.owner && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {typeof video.owner === "object" ? video.owner.fullname : ""}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {video.views?.toLocaleString()} views
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() =>
                    removeMutation.mutate({
                      videoId: video._id,
                      playlistId: watchLaterSummary._id,
                    })
                  }
                  disabled={removingId === video._id}
                  className="flex-shrink-0 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 active:scale-90 transition-transform duration-100"
                  title="Remove from Watch Later"
                >
                  {removingId === video._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
