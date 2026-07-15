export default function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 overflow-hidden animate-pulse">
      <div className="h-44 w-full bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 rounded" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function CardSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
