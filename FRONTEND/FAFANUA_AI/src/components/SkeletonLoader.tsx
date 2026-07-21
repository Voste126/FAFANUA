/**
 * src/components/SkeletonLoader.tsx
 *
 * Animated placeholder cards shown while the Granite model is processing.
 */

const SKELETON_COUNT = 4;

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="rounded-2xl p-6 bg-white/5 border border-white/10 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between mb-4">
        <div className="h-3 w-14 rounded-full bg-white/10" />
        <div className="h-5 w-16 rounded-full bg-white/10" />
      </div>
      <div className="h-5 w-3/4 rounded-lg bg-white/15 mb-5" />
      <div className="space-y-2.5">
        <div className="h-3 w-full rounded-full bg-white/10" />
        <div className="h-3 w-5/6 rounded-full bg-white/10" />
        <div className="h-3 w-4/6 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

export default function SkeletonLoader() {
  return (
    <div className="space-y-4">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <SkeletonCard key={i} delay={i * 100} />
      ))}
    </div>
  );
}
