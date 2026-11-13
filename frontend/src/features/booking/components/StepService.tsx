import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import { SERVICES } from "@/lib/services";

import type { WizardStepProps } from "../steps";

export default function StepService({ draft, onChange, onNext }: WizardStepProps) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
      className="space-y-6"
    >
      <Panel
        title="Choose a service"
        description="Pick what you need now. You can change the service without losing your contact details."
      >
        <div role="radiogroup" aria-label="Service" className="grid gap-4 sm:grid-cols-3">
          {SERVICES.map((service) => {
            const selected = draft.serviceType === service.serviceType;
            return (
              <label
                key={service.slug}
                className={[
                  "flex cursor-pointer flex-col rounded-2xl border p-4 transition",
                  "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600",
                  selected
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                    : "border-slate-200 bg-white hover:border-brand-200",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="service"
                  className="sr-only"
                  checked={selected}
                  onChange={() =>
                    onChange({ serviceType: service.serviceType, vehicleId: null, vehicleLabel: null })
                  }
                />
                <span className="font-semibold text-ink-900">{service.name}</span>
                <span className="mt-1 text-sm leading-relaxed text-ink-500">{service.summary}</span>
                <ul className="mt-3 space-y-1 text-sm text-ink-700">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </label>
            );
          })}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
