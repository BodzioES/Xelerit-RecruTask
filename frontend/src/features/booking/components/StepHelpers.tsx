import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import SelectInput from "@/components/ui/SelectInput";
import { bookingKeys, fetchAvailableEmployees } from "@/features/booking/api";
import { errorMessage } from "@/lib/errors";
import { MAX_HELPERS } from "@/lib/services";

import { draftEndIso, draftStartIso } from "../draft";
import type { WizardStepProps } from "../steps";
import WizardFooter from "./WizardFooter";

export default function StepHelpers({ draft, onChange, onNext, onBack }: WizardStepProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const start = draftStartIso(draft) ?? "";
  const end = draftEndIso(draft) ?? "";
  const ready = Boolean(start && end);

  const movers = useQuery({
    queryKey: bookingKeys.employees(start, end, "mover"),
    queryFn: () => fetchAvailableEmployees(start, end, "mover"),
    enabled: ready,
    retry: false,
  });

  const drivers = useQuery({
    queryKey: bookingKeys.employees(start, end, "driver"),
    queryFn: () => fetchAvailableEmployees(start, end, "driver"),
    enabled: ready,
    retry: false,
  });

  const availableMovers = movers.isSuccess ? movers.data.length : null;
  const maxHelpers = availableMovers === null ? MAX_HELPERS : Math.min(MAX_HELPERS, availableMovers);
  const tooManyHelpers = availableMovers !== null && draft.helpers > availableMovers;
  const noDriver = drivers.isSuccess && drivers.data.length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (tooManyHelpers) {
      setSubmitError("Reduce the number of movers to match today's availability.");
      return;
    }
    if (noDriver) {
      setSubmitError("No driver is available for this window. Go back and choose another date.");
      return;
    }
    setSubmitError(null);
    onNext();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <Panel
        title="Crew"
        description="A driver is always included, even with no helpers. Add movers for carrying and loading."
      >
        {movers.isPending ? <LoadingState label="Checking mover availability" rows={1} /> : null}

        {movers.isError ? (
          <Notice tone="warning">
            We could not check mover availability: {errorMessage(movers.error)} You can still
            continue — the server confirms the crew when the booking is created.
          </Notice>
        ) : null}

        {movers.isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              {availableMovers === 0
                ? "No movers are free for this window."
                : `${availableMovers} ${availableMovers === 1 ? "mover is" : "movers are"} free for this window.`}
            </p>
            {availableMovers === 0 ? (
              <Notice tone="warning">
                Continue with the driver only, or go back and choose another date for a larger
                crew.
              </Notice>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 max-w-xs">
          <SelectInput
            label="Movers"
            value={draft.helpers}
            onChange={(event) => onChange({ helpers: Number(event.target.value) })}
            error={tooManyHelpers ? "More movers were requested than are available." : undefined}
            hint="Up to four movers can join the driver."
          >
            {draft.helpers > maxHelpers ? (
              <option value={draft.helpers} disabled>
                Driver + {draft.helpers} movers (not available)
              </option>
            ) : null}
            {Array.from({ length: maxHelpers + 1 }, (_, count) => (
              <option key={count} value={count}>
                {count === 0
                  ? "Driver only"
                  : `Driver + ${count} ${count === 1 ? "mover" : "movers"}`}
              </option>
            ))}
          </SelectInput>
        </div>

        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink-700">
          Your crew:{" "}
          <span className="font-medium text-ink-900">
            1 driver
            {draft.helpers > 0
              ? ` + ${draft.helpers} ${draft.helpers === 1 ? "mover" : "movers"}`
              : " and no movers"}
          </span>
        </p>

        <p className="mt-4 text-xs text-ink-500">
          The driver and movers are assigned automatically when the booking is created. You do not
          need to choose people.
        </p>
      </Panel>

      {drivers.isFetching ? (
        <p className="text-xs text-ink-500">Checking driver availability…</p>
      ) : null}

      {noDriver ? (
        <Notice tone="error" title="No driver available">
          All our drivers are booked for this window. Go back and choose another date.
        </Notice>
      ) : null}

      {submitError ? <Notice tone="error">{submitError}</Notice> : null}

      <WizardFooter onBack={onBack} submitLabel="Continue" />
    </form>
  );
}
