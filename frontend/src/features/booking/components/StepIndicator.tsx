import type { WizardStep } from "@/features/booking/steps";

type Props = {
  steps: WizardStep[];
  currentIndex: number;
};

export default function StepIndicator({ steps, currentIndex }: Props) {
  const current = steps[currentIndex];

  return (
    <nav aria-label="Booking steps" className="mb-6">
      <p className="text-sm font-medium text-brand-700">
        Step {currentIndex + 1} of {steps.length}
        {current ? ` · ${current.label}` : ""}
      </p>
      <ol className="mt-3 flex flex-wrap gap-2 text-xs">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                isCurrent
                  ? "border-brand-200 bg-brand-50 font-semibold text-brand-700"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-ink-500",
              ].join(" ")}
            >
              <span aria-hidden="true" className="font-mono text-[10px]">
                {isDone ? "✓" : index + 1}
              </span>
              {step.label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
