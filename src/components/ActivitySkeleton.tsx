/**
 * src/components/ActivitySkeleton.tsx
 * Loading skeleton for activity lists
 * Shows while fetching activities from API
 */

interface ActivitySkeletonProps {
  count?: number;
}

export default function ActivitySkeleton({ count = 4 }: ActivitySkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => index + 1).map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          {/* Header row: title + status badge */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-24" />
          </div>

          {/* Details row: date + participants */}
          <div className="flex gap-4 mt-4 text-sm">
            <div className="h-4 bg-gray-100 rounded w-32" />
            <div className="h-4 bg-gray-100 rounded w-32" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <div className="h-9 bg-gray-200 rounded w-20" />
            <div className="h-9 bg-gray-200 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
