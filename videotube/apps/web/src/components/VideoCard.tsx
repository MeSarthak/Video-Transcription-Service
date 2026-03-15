import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Video } from "../types";
import { formatDuration, formatViews, timeAgo } from "../lib/utils";

interface VideoCardProps {
  video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
  const owner = video.ownerDetails ?? video.owner;
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="group block cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
      onClick={() => navigate(`/watch/${video._id}`)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
        {video.thumbnail ? (
          <>
            {/* Shimmer shown until image loads */}
            {!imgLoaded && (
              <div className="skeleton absolute inset-0 rounded-xl" aria-hidden="true" />
            )}
            <img
              src={video.thumbnail}
              alt={video.title}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-200 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex gap-3 mt-3">
        <Link to={`/channel/${owner?.username}`} onClick={(e) => e.stopPropagation()}>
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex-shrink-0 overflow-hidden transition-all duration-150 hover:ring-2 hover:ring-indigo-400">
            {owner?.avatar ? (
              <img src={owner.avatar} alt={owner.fullname} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                {owner?.fullname?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
            {video.title}
          </h3>
          <Link
            to={`/channel/${owner?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mt-0.5 block transition-colors duration-150"
          >
            {owner?.fullname}
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {formatViews(video.views)} · {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
