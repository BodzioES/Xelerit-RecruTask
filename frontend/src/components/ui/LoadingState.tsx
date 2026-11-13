type Props = {
  label?: string;
  rows?: number;
};

export default function LoadingState({ label = "Loading…", rows = 3 }: Props) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <p className="sr-only">{label}</p>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
        />
      ))}
    </div>
  );
}
