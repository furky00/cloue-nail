export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {Array.from({length: 6}).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  )
}
