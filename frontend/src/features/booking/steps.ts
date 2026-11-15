import type { ServiceType } from "@/types/api";

import type { BookingDraft } from "./types";

export type WizardStepId =
  | "schedule"
  | "vehicle"
  | "details"
  | "helpers"
  | "quote"
  | "customer"
  | "summary";

export type WizardStep = {
  id: WizardStepId;
  label: string;
};

export type WizardStepProps = {
  draft: BookingDraft;
  onChange: (patch: Partial<BookingDraft>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function wizardSteps(serviceType: ServiceType): WizardStep[] {
  const steps: WizardStep[] = [
    { id: "schedule", label: "Date & locations" },
    { id: "vehicle", label: "Vehicle" },
  ];

  // Self drive needs no job details: there is nothing to load, carry or move.
  if (serviceType !== "self_drive") {
    steps.push({ id: "details", label: "Job details" });
  }

  if (serviceType === "full_moving") {
    steps.push({ id: "helpers", label: "Crew" });
  }

  steps.push(
    { id: "quote", label: "Quote" },
    { id: "customer", label: "Your details" },
    { id: "summary", label: "Summary" },
  );

  return steps;
}
