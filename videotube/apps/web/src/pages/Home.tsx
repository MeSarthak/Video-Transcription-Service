import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { VideoCard } from "../components/VideoCard";
import { SkeletonVideoCard } from "../components/ui/Skeleton";
import { StaggerList, StaggerItem } from "../components/ui/StaggerList";
import { fetchVideos, queryKeys } from "../lib/queries";

const SORT_OPTIONS = [
  { label: "Newest", sortBy: "createdAt", sortType: "desc" as const },
  { label: "Most Viewed", sortBy: "mostViewed", sortType: "desc" as const },
  { label: "Most Liked", sortBy: "mostLiked", sortType: "desc" as const },
];

export function Home() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [sortIdx, setSortIdx] = useState(0);
  const sort = SORT_OPTIONS[sortIdx]!;

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.videos({ query: urlQuery, sortBy: sort.sortBy, sortType: sort.sortType }),
    queryFn: () =>
      fetchVideos({ query: urlQuery || undefined, sortBy: sort.sortBy, sortType: sort.sortType }),
  });

  const videos = data?.docs ?? [];

  return (
    <div>
      {/* Sort pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {SORT_OPTIONS.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => setSortIdx(i)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 ${
              sortIdx === i
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Skeleton loading grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonVideoCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p className="text-lg">Failed to load videos.</p>
          <p className="text-sm mt-1">Make sure the server is running.</p>
        </div>
      )}

      {!isLoading && !isError && videos.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p className="text-lg">{urlQuery ? `No results for "${urlQuery}"` : "No videos yet."}</p>
        </div>
      )}

      {/* Staggered video grid */}
      {!isLoading && !isError && videos.length > 0 && (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <StaggerItem key={video._id}>
              <VideoCard video={video} />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
