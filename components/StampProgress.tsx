interface StampProgressProps {
  count: number;
  required: number;
}

export default function StampProgress({ count, required }: StampProgressProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: required }, (_, i) => (
        <span
          key={i}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg ${
            i < count
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-dashed border-stone-300 bg-white text-stone-300"
          }`}
        >
          {i < count ? "★" : "☆"}
        </span>
      ))}
      <span className="ml-2 text-sm font-medium text-stone-600">
        {count} / {required}
      </span>
    </div>
  );
}
