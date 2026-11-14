import { useState, type FormEvent } from "react";

import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import SelectInput from "@/components/ui/SelectInput";
import TextArea from "@/components/ui/TextArea";
import TextInput from "@/components/ui/TextInput";
import type { PropertyType } from "@/types/api";

import type { WizardStepProps } from "../steps";
import { FLOOR_PROPERTY_TYPES, PROPERTY_TYPE_OPTIONS } from "../types";
import { hasErrors, validateDetails, type StepErrors } from "../validation";
import ItemListEditor from "./ItemListEditor";
import WizardFooter from "./WizardFooter";

export default function StepDetails({ draft, onChange, onNext, onBack }: WizardStepProps) {
  const [errors, setErrors] = useState<StepErrors>({});
  const moving = draft.serviceType === "full_moving";
  const showFloor = moving && FLOOR_PROPERTY_TYPES.has(draft.movingDetails.propertyType);
  const floorNumber = Number(draft.movingDetails.floor);
  const showElevator = showFloor && draft.movingDetails.floor !== "" && floorNumber > 0;

  function updateMovingDetails(patch: Partial<typeof draft.movingDetails>): void {
    onChange({ movingDetails: { ...draft.movingDetails, ...patch } });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextErrors = validateDetails(draft);
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) onNext();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <Panel
        title={moving ? "Property and access" : "Cargo"}
        description={
          moving
            ? "Tell us about the property so we can plan the crew and the time."
            : "Tell us what we will transport and anything the driver should know."
        }
      >
        {moving ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput
              label="Property type"
              required
              value={draft.movingDetails.propertyType}
              onChange={(event) => {
                const propertyType = event.target.value as PropertyType;
                const keepsFloor = FLOOR_PROPERTY_TYPES.has(propertyType);
                updateMovingDetails({
                  propertyType,
                  floor: keepsFloor ? draft.movingDetails.floor : "",
                  elevator: keepsFloor ? draft.movingDetails.elevator : "",
                });
              }}
            >
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>

            {showFloor ? (
              <TextInput
                label="Floor"
                type="number"
                inputMode="numeric"
                min={0}
                max={200}
                placeholder="0 for ground floor"
                value={draft.movingDetails.floor}
                onChange={(event) => updateMovingDetails({ floor: event.target.value })}
                error={errors.floor}
                hint="Use 0 for the ground floor."
              />
            ) : (
              <div className="flex items-end">
                <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-ink-500">
                  No floor details needed for this property type.
                </p>
              </div>
            )}

            {showElevator ? (
              <SelectInput
                label="Is there an elevator?"
                required
                value={draft.movingDetails.elevator}
                onChange={(event) =>
                  updateMovingDetails({
                    elevator: event.target.value as typeof draft.movingDetails.elevator,
                  })
                }
                error={errors.elevator}
              >
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </SelectInput>
            ) : null}

            <TextInput
              label="Number of boxes"
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              value={draft.movingDetails.boxesCount}
              onChange={(event) => updateMovingDetails({ boxesCount: event.target.value })}
              error={errors.boxes}
              hint="Optional."
            />

            <div className="sm:col-span-2">
              <TextArea
                label="Loading conditions"
                value={draft.movingDetails.itemsDescription}
                onChange={(event) => updateMovingDetails({ itemsDescription: event.target.value })}
                placeholder="Parking, narrow stairs, heavy furniture, disassembly…"
                maxLength={2000}
              />
            </div>
          </div>
        ) : (
          <TextArea
            label="What will we transport?"
            value={draft.customer.notes}
            onChange={(event) =>
              onChange({ customer: { ...draft.customer, notes: event.target.value } })
            }
            placeholder="For example: a sofa, two boxes and a washing machine."
            maxLength={2000}
          />
        )}
      </Panel>

      <Panel title="Items" description="Optional, but it helps us plan the space.">
        <ItemListEditor
          items={draft.items}
          onChange={(items) => onChange({ items })}
          error={errors.items}
        />
      </Panel>

      {moving ? (
        <Panel title="Additional notes" description="Optional. Anything that affects access or timing.">
          <TextArea
            label="Notes"
            value={draft.customer.notes}
            onChange={(event) =>
              onChange({ customer: { ...draft.customer, notes: event.target.value } })
            }
            maxLength={2000}
          />
        </Panel>
      ) : null}

      {Object.keys(errors).length > 0 ? (
        <Notice tone="error">Check the highlighted fields before continuing.</Notice>
      ) : null}

      <WizardFooter onBack={onBack} submitLabel="Continue" />
    </form>
  );
}
