import type { ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
};

export default function SummaryRow({ label, children }: Props) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-full shrink-0 text-sm text-ink-500 sm:w-44">{label}</dt>
      <dd className="text-sm text-ink-900">{children}</dd>
    </div>
  );
}
