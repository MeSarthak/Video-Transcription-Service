import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { VideoCard } from "../components/VideoCard";
import { fetchVideos, queryKeys } from "../lib/queries";

const SORT_OPTIONS = [
  { label: "Newest", sortBy: "createdAt", sortType: "desc" as const },
  { label: "Most Viewed", sortBy: "mostViewed", sortType: "desc" as const },
  { label: "Most Liked", sortBy: "mostLiked", sortType: "desc" as const },
];

export function Home() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const [inputValue, setInputValue] = useState(urlQuery);
  const [sortIdx, setSortIdx] = useState(0);
  const sort = SORT_OPTIONS[sortIdx]!;

  // Sync when URL query param changes (navbar search)
  useEffect(() => {
    setSearch(urlQuery);
    setInputValue(urlQuery);
  }, [urlQuery]);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.videos({ query: search, sortBy: sort.sortBy, sortType: sort.sortType }),
    queryFn: () =>
      fetchVideos({ query: search || undefined, sortBy: sort.sortBy, sortType: sort.sortType }),
  });

  const videos = data?.docs ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(inputValue.trim());
  }

  return (
    <div>
      {/* Search bar (mobile — desktop is in Navbar) */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6 sm:hidden">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search videos…"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600"
        >
          <Search className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </form>

      {/* Sort pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {SORT_OPTIONS.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => setSortIdx(i)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sortIdx === i
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* States */}
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
          <p className="text-lg">Failed to load videos.</p>
          <p className="text-sm mt-1">Make sure the server is running.</p>
        </div>
      )}

      {!isLoading && !isError && videos.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p className="text-lg">{search ? `No results for "${search}"` : "No videos yet."}</p>
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
