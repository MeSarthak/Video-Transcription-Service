import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { VideoCard } from "../components/VideoCard";
import { fetchVideos, queryKeys } from "../lib/queries";

export function Trending() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.videos({ sortBy: "mostViewed", sortType: "desc" }),
    queryFn: () => fetchVideos({ sortBy: "mostViewed", sortType: "desc", limit: 40 }),
  });

  const videos = data?.docs ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-7 h-7 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trending</h1>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="flex gap-3 mt-3">
                <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          Failed to load trending videos.
        </div>
      )}

      {!isLoading && !isError && videos.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          No trending videos yet.
        </div>
      )}

      {!isLoading && !isError && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
