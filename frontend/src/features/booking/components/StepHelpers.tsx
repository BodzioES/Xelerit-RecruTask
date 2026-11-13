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
      setSubmitError("Reduce the number of helpers to match today's availability.");
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
        title="Moving helpers"
        description="One driver is always included. Add movers to help with carrying and loading."
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
                Continue without helpers, or go back and choose another date for a larger crew.
              </Notice>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 max-w-xs">
          <SelectInput
            label="Number of helpers"
            value={draft.helpers}
            onChange={(event) => onChange({ helpers: Number(event.target.value) })}
            error={tooManyHelpers ? "More helpers were requested than are available." : undefined}
            hint="You can add up to four helpers."
          >
            {draft.helpers > maxHelpers ? (
              <option value={draft.helpers} disabled>
                {draft.helpers} helpers (not available)
              </option>
            ) : null}
            {Array.from({ length: maxHelpers + 1 }, (_, count) => (
              <option key={count} value={count}>
                {count === 0 ? "No helpers" : `${count} ${count === 1 ? "helper" : "helpers"}`}
              </option>
            ))}
          </SelectInput>
        </div>

        <p className="mt-4 text-xs text-ink-500">
          The driver and helpers are assigned automatically when the booking is created. You do not
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
