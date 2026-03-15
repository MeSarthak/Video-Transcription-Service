import { useQuery } from "@tanstack/react-query";
import { ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchLikedVideos, queryKeys } from "../lib/queries";
import { VideoCard } from "../components/VideoCard";
import { SkeletonVideoCard } from "../components/ui/Skeleton";
import { StaggerList, StaggerItem } from "../components/ui/StaggerList";
import { useAuth } from "../context/AuthContext";

export function LikedVideos() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.likedVideos(),
    queryFn: fetchLikedVideos,
    enabled: !!user,
  });

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <ThumbsUp className="w-12 h-12 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">Sign in to see your liked videos.</p>
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
  // The backend returns { _id, video, createdAt } — extract the video objects
  const videos = entries.map((e) => e.video).filter(Boolean);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ThumbsUp className="w-7 h-7 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Liked Videos</h1>
        {videos.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{data?.totalDocs ?? videos.length} videos</span>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonVideoCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-gray-500 dark:text-gray-400">Failed to load liked videos.</p>
      )}

      {!isLoading && !isError && videos.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p>You haven't liked any videos yet.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
            Browse videos
          </Link>
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
