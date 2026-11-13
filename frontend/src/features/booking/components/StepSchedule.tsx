import { useState, type FormEvent } from "react";

import Panel from "@/components/ui/Panel";
import SelectInput from "@/components/ui/SelectInput";
import TextInput from "@/components/ui/TextInput";
import LocationPicker from "@/features/locations/components/LocationPicker";
import { formatTime, localDateValue } from "@/lib/datetime";

import { draftEndIso, isSelfDrive } from "../draft";
import type { WizardStepProps } from "../steps";
import { hasErrors, validateSchedule, type StepErrors } from "../validation";
import WizardFooter from "./WizardFooter";

const DURATION_OPTIONS = [2, 3, 4, 6, 8] as const;

export default function StepSchedule({ draft, onChange, onNext, onBack }: WizardStepProps) {
  const [errors, setErrors] = useState<StepErrors>({});
  const selfDrive = isSelfDrive(draft);
  const endIso = draftEndIso(draft);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextErrors = validateSchedule(draft);
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) onNext();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <Panel
        title={selfDrive ? "Pickup and return" : "Route and schedule"}
        description={
          selfDrive
            ? "Tell us where and when you want to collect and return the van."
            : "Tell us where we load and unload, and when the service should start."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <LocationPicker
            label={selfDrive ? "Pickup location" : "Loading location"}
            value={selfDrive ? draft.pickup : draft.loading}
            onChange={(value) => onChange(selfDrive ? { pickup: value } : { loading: value })}
            error={selfDrive ? errors.pickup : errors.loading}
            required
          />
          <LocationPicker
            label={selfDrive ? "Return location" : "Unloading location"}
            value={selfDrive ? draft.returnLocation : draft.unloading}
            onChange={(value) =>
              onChange(selfDrive ? { returnLocation: value } : { unloading: value })
            }
            error={selfDrive ? errors.return : errors.unloading}
            required
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {selfDrive ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Pickup date"
                  type="date"
                  required
                  min={localDateValue(new Date())}
                  value={draft.startDate}
                  onChange={(event) => onChange({ startDate: event.target.value })}
                  error={errors.start}
                />
                <TextInput
                  label="Pickup time"
                  type="time"
                  required
                  value={draft.startTime}
                  onChange={(event) => onChange({ startTime: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Return date"
                  type="date"
                  required
                  min={draft.startDate}
                  value={draft.endDate}
                  onChange={(event) => onChange({ endDate: event.target.value })}
                  error={errors.end}
                />
                <TextInput
                  label="Return time"
                  type="time"
                  required
                  value={draft.endTime}
                  onChange={(event) => onChange({ endTime: event.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Service date"
                  type="date"
                  required
                  min={localDateValue(new Date())}
                  value={draft.startDate}
                  onChange={(event) => onChange({ startDate: event.target.value })}
                  error={errors.start}
                />
                <TextInput
                  label="Start time"
                  type="time"
                  required
                  value={draft.startTime}
                  onChange={(event) => onChange({ startTime: event.target.value })}
                />
              </div>
              <SelectInput
                label="Estimated duration"
                hint={endIso ? `Ends around ${formatTime(endIso)}.` : undefined}
                value={draft.durationHours}
                onChange={(event) => onChange({ durationHours: Number(event.target.value) })}
                error={errors.end}
              >
                {DURATION_OPTIONS.map((hours) => (
                  <option key={hours} value={hours}>
                    {hours} hours
                  </option>
                ))}
              </SelectInput>
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-ink-500">
          We serve Trójmiasto and up to 30 km around it. All times are in your local timezone.
        </p>
      </Panel>

      <WizardFooter
        onBack={onBack}
        submitLabel="Show available vans"
        hint="We only show vans that are free for this window."
      />
    </form>
  );
}
