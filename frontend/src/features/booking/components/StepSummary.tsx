import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import { bookingKeys, fetchQuote } from "@/features/booking/api";
import { formatDateTime } from "@/lib/datetime";
import { errorMessage } from "@/lib/errors";
import { serviceByType } from "@/lib/services";

import {
  draftEndIso,
  draftStartIso,
  isSelfDrive,
  quoteRequestFromDraft,
} from "../draft";
import type { WizardStepProps } from "../steps";
import { FLOOR_PROPERTY_TYPES, PROPERTY_TYPE_OPTIONS } from "../types";
import QuoteBreakdown from "./QuoteBreakdown";
import SummaryRow from "@/components/ui/SummaryRow";
import WizardFooter from "./WizardFooter";

export type SummaryStepProps = WizardStepProps & {
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
};

const checkboxClassName =
  "mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export default function StepSummary({
  draft,
  onSubmit,
  onBack,
  isSubmitting,
  submitError,
}: SummaryStepProps) {
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const selfDrive = isSelfDrive(draft);
  const moving = draft.serviceType === "full_moving";
  const movingDetails = draft.movingDetails;
  const showFloor = moving && FLOOR_PROPERTY_TYPES.has(movingDetails.propertyType);
  const floor = showFloor && movingDetails.floor !== "" ? movingDetails.floor : null;
  const propertyLabel =
    PROPERTY_TYPE_OPTIONS.find((option) => option.value === movingDetails.propertyType)?.label ??
    movingDetails.propertyType;
  const carryLabels = [
    movingDetails.needsCarryIn ? "Into the new property" : null,
    movingDetails.needsCarryOut ? "Out of the current property" : null,
  ].filter((label): label is string => label !== null);
  const itemSummary = draft.items
    .filter((item) => item.itemName.trim())
    .map((item) => `${item.itemName.trim()} ×${item.quantity || "1"}`)
    .join(", ");
  const startIso = draftStartIso(draft);
  const endIso = draftEndIso(draft);
  const request = startIso && endIso ? quoteRequestFromDraft(draft, startIso, endIso) : null;

  const quote = useQuery({
    queryKey: request ? bookingKeys.quote(request) : (["pricing", "quote", "incomplete"] as const),
    queryFn: () => {
      if (!request) throw new Error("The booking window is incomplete");
      return fetchQuote(request);
    },
    enabled: request !== null,
    retry: false,
    staleTime: 30_000,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!accepted) {
      setTermsError("Confirm the details and terms before placing the booking.");
      return;
    }
    setTermsError(null);
    onSubmit();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <Panel title="Booking summary" description="Check everything before you place the booking.">
        <dl className="divide-y divide-slate-100">
          <SummaryRow label="Service">{serviceByType(draft.serviceType).name}</SummaryRow>
          <SummaryRow label="Vehicle">
            {draft.vehicleLabel ?? (selfDrive ? "Not selected" : "Any available van")}
          </SummaryRow>
          <SummaryRow label="Date and time">
            {startIso && endIso
              ? `${formatDateTime(startIso)} → ${formatDateTime(endIso)}`
              : "Not selected"}
          </SummaryRow>
          <SummaryRow label={selfDrive ? "Pickup" : "Loading"}>
            {selfDrive ? draft.pickup.address : draft.loading.address}
          </SummaryRow>
          <SummaryRow label={selfDrive ? "Return" : "Unloading"}>
            {selfDrive ? draft.returnLocation.address : draft.unloading.address}
          </SummaryRow>
          {moving ? (
            <SummaryRow label="Property">
              {propertyLabel}
              {floor !== null ? `, floor ${floor}` : ""}
              {floor !== null && Number(floor) > 0
                ? movingDetails.elevator === "yes"
                  ? ", elevator"
                  : ", no elevator"
                : ""}
            </SummaryRow>
          ) : null}
          {moving && carryLabels.length > 0 ? (
            <SummaryRow label="Carry service">{carryLabels.join(", ")}</SummaryRow>
          ) : null}
          {moving && movingDetails.boxesCount !== "" ? (
            <SummaryRow label="Boxes">{movingDetails.boxesCount}</SummaryRow>
          ) : null}
          {!selfDrive && itemSummary ? <SummaryRow label="Items">{itemSummary}</SummaryRow> : null}
          {moving ? (
            <SummaryRow label="Helpers">
              {draft.helpers === 0
                ? "No helpers"
                : `${draft.helpers} ${draft.helpers === 1 ? "helper" : "helpers"}`}
            </SummaryRow>
          ) : null}
          {!selfDrive ? (
            <SummaryRow label="Additional service">
              {draft.additionalService ? "Yes" : "No"}
            </SummaryRow>
          ) : null}
          <SummaryRow label="Contact">
            {draft.customer.firstName} {draft.customer.lastName}
            <br />
            {draft.customer.email}
            <br />
            {draft.customer.phone}
          </SummaryRow>
          {draft.customer.notes.trim() ? (
            <SummaryRow label="Notes">{draft.customer.notes}</SummaryRow>
          ) : null}
        </dl>
      </Panel>

      <Panel title="Price" description="The server calculates the final price when the booking is created.">
        {!request ? (
          <Notice tone="error">
            The booking window is incomplete. Go back and choose the date and locations again.
          </Notice>
        ) : null}
        {request && quote.isPending ? <LoadingState label="Confirming the quote" rows={2} /> : null}
        {request && quote.isError ? (
          <Notice tone="error">{errorMessage(quote.error)}</Notice>
        ) : null}
        {quote.isSuccess ? <QuoteBreakdown quote={quote.data} /> : null}
      </Panel>

      <Panel title="Before you book">
        <label className="flex items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            className={checkboxClassName}
            checked={accepted}
            onChange={(event) => {
              setAccepted(event.target.checked);
              if (event.target.checked) setTermsError(null);
            }}
            aria-invalid={termsError ? true : undefined}
          />
          <span>
            I confirm the details above are correct. I understand that the booking is created with
            the <strong className="font-semibold">Pending review</strong> status and the Provider
            confirms it before the service starts. I can cancel it from the booking page until the
            service begins.
          </span>
        </label>
        {termsError ? <p className="mt-2 text-sm text-rose-700">{termsError}</p> : null}
      </Panel>

      {submitError ? (
        <Notice tone="error" title="The booking could not be created">
          {submitError} Your data is still here — fix the problem and try again.
        </Notice>
      ) : null}

      <WizardFooter
        onBack={onBack}
        submitLabel="Place booking"
        hint="You will get a booking number and a private status link."
        isBusy={isSubmitting}
        disabled={quote.isPending || quote.isError}
      />
    </form>
  );
}
