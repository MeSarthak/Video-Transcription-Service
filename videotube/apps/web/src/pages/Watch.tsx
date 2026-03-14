import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, Bell, BellOff, Send, Trash2 } from "lucide-react";
import {
  fetchVideoById,
  fetchRelatedVideos,
  fetchComments,
  postComment,
  deleteComment,
  toggleVideoLike,
  toggleCommentLike,
  toggleSubscription,
  incrementView,
  addToWatchHistory,
  fetchVideoSASUrl,
  queryKeys,
} from "../lib/queries";
import { VideoCard } from "../components/VideoCard";
import { useAuth } from "../context/AuthContext";
import type { Comment } from "../types";

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return String(views);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function Watch() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const viewTracked = useRef(false);
  const [commentText, setCommentText] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);

  const {
    data: video,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.video(videoId!),
    queryFn: () => fetchVideoById(videoId!),
    enabled: !!videoId,
  });

  const { data: relatedData } = useQuery({
    queryKey: queryKeys.relatedVideos(videoId!),
    queryFn: () => fetchRelatedVideos(videoId!),
    enabled: !!videoId,
  });

  const { data: commentsData } = useQuery({
    queryKey: queryKeys.comments(videoId!),
    queryFn: () => fetchComments(videoId!),
    enabled: !!videoId,
  });

  const { data: sasData, isLoading: isSASLoading } = useQuery({
    queryKey: queryKeys.videoSASUrl(videoId!),
    queryFn: () => fetchVideoSASUrl(videoId!),
    enabled: !!videoId && !!video?.masterPlaylist && video.status === "published",
    // SAS tokens are valid for 1 hour; refetch 5 minutes before expiry
    staleTime: 55 * 60 * 1000,
  });

  // Increment view count + update watch history once per page load
  useEffect(() => {
    if (videoId && !viewTracked.current) {
      viewTracked.current = true;
      incrementView(videoId).catch(() => {});
      if (isAuthenticated) {
        addToWatchHistory(videoId).catch(() => {});
      }
    }
  }, [videoId, isAuthenticated]);

  // ── Like toggle ──────────────────────────────
  const likeMutation = useMutation({
    mutationFn: () => toggleVideoLike(videoId!),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.video(videoId!), (old: any) =>
        old
          ? {
              ...old,
              isLiked: result.liked,
              likesCount: result.likesCount,
            }
          : old,
      );
    },
  });

  // ── Subscribe toggle ─────────────────────────
  const subMutation = useMutation({
    mutationFn: () => toggleSubscription(video!.owner._id),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.video(videoId!), (old: any) =>
        old ? { ...old, isSubscribed: result.subscribed } : old,
      );
    },
  });

  // ── Post comment ─────────────────────────────
  const commentMutation = useMutation({
    mutationFn: (content: string) => postComment(videoId!, content),
    onSuccess: (newComment) => {
      setCommentText("");
      queryClient.setQueryData(queryKeys.comments(videoId!), (old: any) =>
        old
          ? { ...old, docs: [newComment, ...old.docs], totalDocs: old.totalDocs + 1 }
          : old,
      );
    },
  });

  // ── Delete comment ───────────────────────────
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData(queryKeys.comments(videoId!), (old: any) =>
        old
          ? {
              ...old,
              docs: old.docs.filter((c: Comment) => c._id !== commentId),
              totalDocs: old.totalDocs - 1,
            }
          : old,
      );
    },
  });

  // ── Comment like toggle ───────────────────────
  const commentLikeMutation = useMutation({
    mutationFn: (commentId: string) => toggleCommentLike(commentId),
    onSuccess: (result, commentId) => {
      queryClient.setQueryData(queryKeys.comments(videoId!), (old: any) =>
        old
          ? {
              ...old,
              docs: old.docs.map((c: Comment) =>
                c._id === commentId
                  ? { ...c, isLiked: result.liked, likesCount: result.likesCount }
                  : c,
              ),
            }
          : old,
      );
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-screen-xl mx-auto animate-pulse">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="mt-4 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
          <div className="lg:w-96 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-40 aspect-video bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        Video not found or failed to load.
      </div>
    );
  }

  const comments = commentsData?.docs ?? [];
  const related = relatedData ?? [];
  const owner = video.owner;

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left column ──────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Player */}
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            {video.status !== "published" || !video.masterPlaylist ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <p>Video is still processing…</p>
              </div>
            ) : isSASLoading ? (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <p>Loading player…</p>
              </div>
            ) : sasData?.sasUrl ? (
              <HLSPlayer src={sasData.sasUrl} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <p>Unable to load video. Please try again.</p>
              </div>
            )}
          </div>

          {/* Title + meta */}
          <h1 className="mt-4 text-lg font-bold text-gray-900 dark:text-white leading-snug">
            {video.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatViews(video.views)} views · {timeAgo(video.createdAt)}
          </p>

          {/* Channel row + actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Link to={`/channel/${owner.username}`}>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden">
                  {owner.avatar ? (
                    <img src={owner.avatar} alt={owner.fullname} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-600 font-bold">
                      {owner.fullname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
              <div>
                <Link
                  to={`/channel/${owner.username}`}
                  className="text-sm font-semibold text-gray-900 dark:text-white hover:underline"
                >
                  {owner.fullname}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">@{owner.username}</p>
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => subMutation.mutate()}
                  disabled={subMutation.isPending}
                  className={`ml-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    video.isSubscribed
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      : "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
                  }`}
                >
                  {video.isSubscribed ? (
                    <>
                      <BellOff className="w-4 h-4" /> Subscribed
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" /> Subscribe
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Like */}
            <button
              onClick={() => isAuthenticated && likeMutation.mutate()}
              disabled={!isAuthenticated || likeMutation.isPending}
              title={isAuthenticated ? undefined : "Sign in to like"}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                video.isLiked
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              } disabled:opacity-50`}
            >
              <ThumbsUp className="w-4 h-4" />
              {video.likesCount ?? 0}
            </button>
          </div>

          {/* Description */}
          {video.description && (
            <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
              <p
                className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap ${
                  descExpanded ? "" : "line-clamp-3"
                }`}
              >
                {video.description}
              </p>
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 hover:underline"
              >
                {descExpanded ? "Show less" : "Show more"}
              </button>
            </div>
          )}

          {/* Comments */}
          <div className="mt-8">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {commentsData?.totalDocs ?? 0} Comments
            </h2>

            {/* Comment input */}
            {isAuthenticated && (
              <form
                className="flex gap-3 mb-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = commentText.trim();
                  if (t) commentMutation.mutate(t);
                }}
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex-shrink-0 overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.fullname} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {user?.fullname?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 border-b border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 py-1"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || commentMutation.isPending}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-full disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Comment list */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentRow
                  key={comment._id}
                  comment={comment}
                  currentUserId={user?._id}
                  onLike={() => isAuthenticated && commentLikeMutation.mutate(comment._id)}
                  onDelete={() => deleteCommentMutation.mutate(comment._id)}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: related ─────────────────── */}
        <div className="lg:w-96 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Related Videos
          </h2>
          {related.length === 0 ? (
            <p className="text-sm text-gray-400">No related videos.</p>
          ) : (
            <div className="space-y-3">
              {related.map((v) => (
                <RelatedVideoRow key={v._id} video={v} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────

interface CommentRowProps {
  comment: Comment;
  currentUserId?: string;
  onLike: () => void;
  onDelete: () => void;
  isAuthenticated: boolean;
}

function CommentRow({ comment, currentUserId, onLike, onDelete, isAuthenticated }: CommentRowProps) {
  const isOwner = currentUserId === comment.owner._id;

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="flex gap-3">
      <Link to={`/channel/${comment.owner.username}`} className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden">
          {comment.owner.avatar ? (
            <img src={comment.owner.avatar} alt={comment.owner.fullname} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-indigo-600 font-bold text-xs">
              {comment.owner.fullname?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/channel/${comment.owner.username}`}
            className="text-xs font-semibold text-gray-900 dark:text-white hover:underline"
          >
            {comment.owner.fullname}
          </Link>
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={onLike}
            disabled={!isAuthenticated}
            className={`flex items-center gap-1 text-xs ${
              comment.isLiked
                ? "text-indigo-600"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            } disabled:opacity-50`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {comment.likesCount > 0 && comment.likesCount}
          </button>
          {isOwner && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import type { Video } from "../types";

function RelatedVideoRow({ video }: { video: Video }) {
  const owner = video.ownerDetails ?? video.owner;

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "Today";
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <Link to={`/watch/${video._id}`} className="flex gap-2 group">
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
            No thumb
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {video.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{owner?.fullname}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(video.createdAt)}</p>
      </div>
    </Link>
  );
}

// ── HLS Player ───────────────────────────────

interface QualityLevel {
  index: number;   // hls.js level index, -1 = auto
  label: string;   // e.g. "720p", "Auto"
}

function HLSPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset quality state on src change
    setQualities([]);
    setCurrentQuality(-1);
    setShowQualityMenu(false);

    // Check native HLS support (Safari) — no quality switching UI in this path
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => {
        video.src = "";
      };
    }

    // Use hls.js
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        const hls = new Hls({ autoStartLoad: true });
        hlsRef.current = hls;

        // Once the manifest is parsed we know the available levels
        hls.on(Hls.Events.MANIFEST_PARSED, (_event: any, data: any) => {
          if (cancelled) return;
          const levels: QualityLevel[] = data.levels.map((lvl: any, i: number) => ({
            index: i,
            label: lvl.height ? `${lvl.height}p` : `Level ${i}`,
          }));
          // Prepend "Auto" option
          setQualities([{ index: -1, label: "Auto" }, ...levels]);
          setCurrentQuality(-1); // start on auto
        });

        // Keep currentQuality display in sync when auto-switching happens
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event: any, data: any) => {
          if (cancelled) return;
          // Only update the display label if we're in auto mode
          if (hls.autoLevelEnabled) {
            setCurrentQuality(-1);
          }
        });

        hls.loadSource(src);
        hls.attachMedia(video);
      }
    });

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const handleQualitySelect = (levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (levelIndex === -1) {
      hls.currentLevel = -1;      // re-enable ABR
      hls.nextLevel = -1;
    } else {
      hls.currentLevel = levelIndex; // lock to this level
    }
    setCurrentQuality(levelIndex);
    setShowQualityMenu(false);
  };

  const currentLabel =
    qualities.find((q) => q.index === currentQuality)?.label ?? "Auto";

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        controls
        className="w-full h-full"
        autoPlay={false}
      />

      {/* Quality selector — only shown when hls.js parsed levels */}
      {qualities.length > 1 && (
        <div ref={menuRef} className="absolute bottom-12 right-3 z-10">
          <button
            onClick={() => setShowQualityMenu((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/70 hover:bg-black/90 text-white text-xs font-medium backdrop-blur-sm transition-colors"
            title="Change quality"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            {currentLabel}
          </button>

          {showQualityMenu && (
            <div className="absolute bottom-full right-0 mb-1 w-28 rounded-lg overflow-hidden shadow-xl bg-black/90 backdrop-blur-sm border border-white/10">
              {qualities.map((q) => (
                <button
                  key={q.index}
                  onClick={() => handleQualitySelect(q.index)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    currentQuality === q.index
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-gray-200 hover:bg-white/10"
                  }`}
                >
                  {q.label}
                  {q.index === -1 && currentQuality === -1 && (
                    <span className="ml-1 text-indigo-300 text-[10px]">(on)</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
