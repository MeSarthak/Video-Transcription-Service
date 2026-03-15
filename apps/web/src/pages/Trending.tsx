import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { VideoCard } from "../components/VideoCard";
import { SkeletonVideoCard } from "../components/ui/Skeleton";
import { StaggerList, StaggerItem } from "../components/ui/StaggerList";
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
            <SkeletonVideoCard key={i} />
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
