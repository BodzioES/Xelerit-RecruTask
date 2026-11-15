import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/ui/Button";
import AssistantTip from "@/features/assistant/components/AssistantTip";
import { errorMessage } from "@/lib/errors";
import { serviceByType, type ServiceMeta, type ServiceSlug } from "@/lib/services";
import type { BookingCreated } from "@/types/api";

import { buildCreateRequest, createInitialDraft, draftEndIso, draftStartIso } from "../draft";
import { wizardSteps } from "../steps";
import type { BookingDraft, CreateBookingRequest } from "../types";
import StepCustomer from "./StepCustomer";
import StepDetails from "./StepDetails";
import StepHelpers from "./StepHelpers";
import StepIndicator from "./StepIndicator";
import StepQuote from "./StepQuote";
import StepSchedule from "./StepSchedule";
import StepSummary from "./StepSummary";
import StepVehicle from "./StepVehicle";

type Props = {
  service: ServiceMeta;
  title: string;
  /** Guests post to the public endpoint; the Provider posts to its own. */
  submitBooking: (request: CreateBookingRequest) => Promise<BookingCreated>;
  onCreated: (booking: BookingCreated) => void;
  servicePath: (slug: ServiceSlug) => string;
  exitPath: string;
  exitLabel: string;
};

export default function BookingWizard({
  service,
  title,
  submitBooking,
  onCreated,
  servicePath,
  exitPath,
  exitLabel,
}: Props) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BookingDraft>(() =>
    createInitialDraft(service.serviceType),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const steps = wizardSteps(draft.serviceType);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  const create = useMutation({
    mutationFn: submitBooking,
    onSuccess: onCreated,
    onError: (error) => setSubmitError(errorMessage(error)),
  });

  useEffect(() => {
    setDraft((current) =>
      current.serviceType === service.serviceType
        ? current
        : {
            ...current,
            serviceType: service.serviceType,
            vehicleId: null,
            vehicleLabel: null,
          },
    );
  }, [service.serviceType]);

  useEffect(() => {
    setStepIndex((index) => Math.min(index, steps.length - 1));
  }, [steps.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex]);

  function updateDraft(patch: Partial<BookingDraft>): void {
    setSubmitError(null);
    setDraft((current) => ({ ...current, ...patch }));
    if (patch.serviceType && patch.serviceType !== draft.serviceType) {
      navigate(servicePath(serviceByType(patch.serviceType).slug), { replace: true });
    }
  }

  function goNext(): void {
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  function goBack(): void {
    if (stepIndex === 0) {
      navigate(exitPath);
      return;
    }
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  function placeBooking(): void {
    const startIso = draftStartIso(draft);
    const endIso = draftEndIso(draft);
    if (!startIso || !endIso) {
      setSubmitError("The booking window is incomplete. Go back and choose the date again.");
      return;
    }
    setSubmitError(null);
    try {
      create.mutate(buildCreateRequest(draft, startIso, endIso));
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "The booking request is incomplete.",
      );
    }
  }

  function renderStep() {
    const stepProps = { draft, onChange: updateDraft, onNext: goNext, onBack: goBack };

    switch (currentStep.id) {
      case "schedule":
        return <StepSchedule {...stepProps} />;
      case "vehicle":
        return <StepVehicle {...stepProps} />;
      case "details":
        return <StepDetails {...stepProps} />;
      case "helpers":
        return <StepHelpers {...stepProps} />;
      case "quote":
        return <StepQuote {...stepProps} />;
      case "customer":
        return <StepCustomer {...stepProps} />;
      case "summary":
        return (
          <StepSummary
            {...stepProps}
            onSubmit={placeBooking}
            isSubmitting={create.isPending}
            submitError={submitError}
          />
        );
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-ink-900">{service.summary}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">{service.pricing}</p>
      </div>

      {service.isMoving ? (
        <div className="mt-3">
          <AssistantTip>
            Not sure how many movers or what details to enter? On the Job details step, describe
            your move in your own words and our AI assistant fills in the form for you.
          </AssistantTip>
        </div>
      ) : null}

      <div className="mt-8">
        <StepIndicator steps={steps} currentIndex={stepIndex} />
        {renderStep()}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4 text-sm text-ink-500">
        <Button variant="ghost" onClick={() => navigate(exitPath)}>
          {exitLabel}
        </Button>
      </div>
    </div>
  );
}
