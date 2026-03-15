import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, Bell, BellOff, Send, Trash2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  fetchVideoById,
  fetchRelatedVideos,
  fetchComments,
  postComment,
  deleteComment,
  deleteVideo,
  toggleVideoLike,
  toggleCommentLike,
  toggleSubscription,
  incrementView,
  addToWatchHistory,
  fetchVideoSASUrl,
  queryKeys,
} from "../lib/queries";
import { useAuth } from "../context/AuthContext";
import type { Comment, Video, PaginatedResponse } from "../types";
import { SkeletonRelatedRow, Skeleton } from "../components/ui/Skeleton";
import axios from "axios";
import { formatViews, formatDuration, timeAgo } from "../lib/utils";

export function Watch() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const viewTracked = useRef(false);
  const [commentText, setCommentText] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [likeAnimKey, setLikeAnimKey] = useState(0);
  const reduced = useReducedMotion();

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
    // Cache for 55 min by default; the refetchInterval below overrides per actual expiresIn
    staleTime: 55 * 60 * 1000,
    // Proactively refresh 2 minutes before the SAS token expires to prevent
    // mid-playback "token expired" errors.
    refetchInterval: (query) => {
      const expiresIn = query.state.data?.expiresIn;
      if (!expiresIn) return false;
      const refreshMs = Math.max((expiresIn - 120) * 1000, 60_000);
      return refreshMs;
    },
  });

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
      queryClient.setQueryData<Video>(queryKeys.video(videoId!), (old) =>
        old ? { ...old, isLiked: result.liked, likesCount: result.likesCount } : old,
      );
      if (result.liked) setLikeAnimKey((k) => k + 1);
    },
  });

  // ── Subscribe toggle ─────────────────────────
  const subMutation = useMutation({
    mutationFn: () => toggleSubscription(video!.owner._id),
    onSuccess: (result) => {
      queryClient.setQueryData<Video>(queryKeys.video(videoId!), (old) =>
        old ? { ...old, isSubscribed: result.subscribed } : old,
      );
    },
  });

  // ── Post comment ─────────────────────────────
  const commentMutation = useMutation({
    mutationFn: (content: string) => postComment(videoId!, content),
    onSuccess: (newComment) => {
      setCommentText("");
      queryClient.setQueryData<PaginatedResponse<Comment>>(queryKeys.comments(videoId!), (old) =>
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
      queryClient.setQueryData<PaginatedResponse<Comment>>(queryKeys.comments(videoId!), (old) =>
        old
          ? {
              ...old,
              docs: old.docs.filter((c) => c._id !== commentId),
              totalDocs: old.totalDocs - 1,
            }
          : old,
      );
    },
  });

  // ── Delete video ──────────────────────────────
  const deleteVideoMutation = useMutation({
    mutationFn: () => deleteVideo(videoId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      navigate("/");
    },
  });

  // ── Comment like toggle ───────────────────────
  const commentLikeMutation = useMutation({
    mutationFn: (commentId: string) => toggleCommentLike(commentId),
    onSuccess: (result, commentId) => {
      queryClient.setQueryData<PaginatedResponse<Comment>>(queryKeys.comments(videoId!), (old) =>
        old
          ? {
              ...old,
              docs: old.docs.map((c) =>
                c._id === commentId
                  ? { ...c, isLiked: result.liked, likesCount: result.likesCount }
                  : c,
              ),
            }
          : old,
      );
    },
  });

  // ── Loading skeleton ──────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="skeleton aspect-video rounded-xl w-full" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
          <div className="lg:w-96 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRelatedRow key={i} />
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
    <motion.div
      className="max-w-screen-xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: "easeOut" }}
    >
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
              <div className="skeleton w-full h-full" />
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
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden transition-all duration-150 hover:ring-2 hover:ring-indigo-400">
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
              {isAuthenticated && user?._id !== owner._id && (
                <button
                  onClick={() => subMutation.mutate()}
                  disabled={subMutation.isPending}
                  className={`ml-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-60 ${
                    video.isSubscribed
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                      : "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
                  }`}
                >
                  {video.isSubscribed ? (
                    <><BellOff className="w-4 h-4" /> Subscribed</>
                  ) : (
                    <><Bell className="w-4 h-4" /> Subscribe</>
                  )}
                </button>
              )}
            </div>

            {/* Like + Delete */}
            <div className="flex items-center gap-2">
              <motion.button
                key={likeAnimKey}
                onClick={() => isAuthenticated && likeMutation.mutate()}
                disabled={!isAuthenticated || likeMutation.isPending}
                title={isAuthenticated ? undefined : "Sign in to like"}
                animate={
                  likeAnimKey > 0 && !reduced
                    ? { scale: [1, 1.3, 0.9, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 ${
                  video.isLiked
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                } disabled:opacity-50`}
              >
                <ThumbsUp className="w-4 h-4" />
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={video.likesCount}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {video.likesCount ?? 0}
                  </motion.span>
                </AnimatePresence>
              </motion.button>

              {/* Delete — only for owner */}
              {isAuthenticated && user?._id === video.owner._id && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete video"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
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
                className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 hover:underline active:scale-95 transition-transform duration-100"
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
                    className="flex-1 border-b border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 py-1 transition-colors duration-150"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || commentMutation.isPending}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-full disabled:opacity-40 transition-colors active:scale-90"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Comment list */}
            <div className="space-y-4">
              <AnimatePresence initial={false}>
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
              </AnimatePresence>
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

      {/* ── Delete confirm dialog ─────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete video?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This will permanently delete the video and all its data. This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteVideoMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteVideoMutation.mutate()}
                  disabled={deleteVideoMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteVideoMutation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deleting…</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Delete</>
                  )}
                </button>
              </div>
              {deleteVideoMutation.isError && (
                <p className="mt-3 text-xs text-red-500">
                  {axios.isAxiosError(deleteVideoMutation.error)
                    ? (deleteVideoMutation.error.response?.data as { message?: string })?.message ?? "Delete failed. Please try again."
                    : "Delete failed. Please try again."}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex gap-3"
    >
      <Link to={`/channel/${comment.owner.username}`} className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden transition-all duration-150 hover:ring-2 hover:ring-indigo-400">
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
            className={`flex items-center gap-1 text-xs transition-colors duration-150 active:scale-90 ${
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
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors duration-150 active:scale-90"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RelatedVideoRow({ video }: { video: Video }) {
  const owner = video.ownerDetails ?? video.owner;

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
  index: number;
  label: string;
}

function HLSPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

    setQualities([]);
    setCurrentQuality(-1);
    setShowQualityMenu(false);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => { video.src = ""; };
    }

    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (Hls.isSupported()) {
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        const hls = new Hls({ autoStartLoad: true });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_event: any, data: any) => {
          if (cancelled) return;
          const levels: QualityLevel[] = data.levels.map((lvl: any, i: number) => ({
            index: i,
            label: lvl.height ? `${lvl.height}p` : `Level ${i}`,
          }));
          setQualities([{ index: -1, label: "Auto" }, ...levels]);
          setCurrentQuality(-1);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event: any, _data: any) => {
          if (cancelled) return;
          if (hls.autoLevelEnabled) setCurrentQuality(-1);
        });

        hls.loadSource(src);
        hls.attachMedia(video);
      }
    });

    return () => {
      cancelled = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [src]);

  const handleQualitySelect = (levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (levelIndex === -1) { hls.currentLevel = -1; hls.nextLevel = -1; }
    else { hls.currentLevel = levelIndex; }
    setCurrentQuality(levelIndex);
    setShowQualityMenu(false);
  };

  const currentLabel = qualities.find((q) => q.index === currentQuality)?.label ?? "Auto";

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} controls className="w-full h-full" autoPlay={false} />

      {qualities.length > 1 && (
        <div ref={menuRef} className="absolute bottom-12 right-3 z-10">
          <button
            onClick={() => setShowQualityMenu((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-black/70 hover:bg-black/90 text-white text-xs font-medium backdrop-blur-sm transition-colors active:scale-95"
            title="Change quality"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            {currentLabel}
          </button>

          <AnimatePresence>
            {showQualityMenu && (
              <motion.div
                className="absolute bottom-full right-0 mb-1 w-28 rounded-lg overflow-hidden shadow-xl bg-black/90 backdrop-blur-sm border border-white/10"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
