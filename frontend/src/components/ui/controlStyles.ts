export function controlClassName(hasError: boolean): string {
  return [
    "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink-900 shadow-sm transition",
    "placeholder:text-slate-400",
    "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
    hasError
      ? "border-rose-400 focus-visible:outline-rose-500"
      : "border-slate-300 focus:border-brand-400 focus-visible:outline-brand-600",
  ].join(" ");
}
