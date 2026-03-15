/**
 * Skeleton — shimmer placeholder components.
 * Uses the `.skeleton` CSS class defined in index.css.
 */

interface SkeletonProps {
  className?: string;
}

/** Generic shimmer box — pass width/height via className */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded ${className}`} aria-hidden="true" />;
}

/** Circular avatar skeleton */
export function SkeletonAvatar({ size = "w-9 h-9" }: { size?: string }) {
  return <div className={`skeleton rounded-full flex-shrink-0 ${size}`} aria-hidden="true" />;
}

/** Full video card skeleton (thumbnail + meta lines) */
export function SkeletonVideoCard() {
  return (
    <div aria-hidden="true">
      {/* Thumbnail */}
      <div className="skeleton aspect-video rounded-xl w-full" />
      {/* Meta */}
      <div className="flex gap-3 mt-3">
        <SkeletonAvatar size="w-9 h-9" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="skeleton h-3 rounded w-3/4" />
          <div className="skeleton h-3 rounded w-1/2" />
          <div className="skeleton h-3 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

/** Horizontal related-video row skeleton (Watch page sidebar) */
export function SkeletonRelatedRow() {
  return (
    <div className="flex gap-2" aria-hidden="true">
      <div className="skeleton w-40 aspect-video rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="skeleton h-3 rounded w-full" />
        <div className="skeleton h-3 rounded w-3/4" />
        <div className="skeleton h-3 rounded w-1/2" />
      </div>
    </div>
  );
}

/** Text line skeleton */
export function SkeletonText({ width = "w-full", height = "h-3" }: { width?: string; height?: string }) {
  return <div className={`skeleton rounded ${height} ${width}`} aria-hidden="true" />;
}
