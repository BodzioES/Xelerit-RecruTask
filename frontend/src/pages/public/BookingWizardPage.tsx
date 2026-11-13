import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import StepCustomer from "@/features/booking/components/StepCustomer";
import StepDetails from "@/features/booking/components/StepDetails";
import StepHelpers from "@/features/booking/components/StepHelpers";
import StepIndicator from "@/features/booking/components/StepIndicator";
import StepQuote from "@/features/booking/components/StepQuote";
import StepSchedule from "@/features/booking/components/StepSchedule";
import StepService from "@/features/booking/components/StepService";
import StepSummary from "@/features/booking/components/StepSummary";
import StepVehicle from "@/features/booking/components/StepVehicle";
import { createBooking, rememberBookingToken } from "@/features/booking/api";
import {
  buildCreateRequest,
  createInitialDraft,
  draftEndIso,
  draftStartIso,
} from "@/features/booking/draft";
import { wizardSteps } from "@/features/booking/steps";
import type { BookingDraft } from "@/features/booking/types";
import { errorMessage } from "@/lib/errors";
import { serviceBySlug, serviceByType, type ServiceMeta } from "@/lib/services";

function UnknownService() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <Notice tone="warning" title="Unknown service">
        This booking link does not match any of our services.
      </Notice>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Back to home
      </Link>
    </div>
  );
}

function BookingWizard({ service }: { service: ServiceMeta }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BookingDraft>(() =>
    createInitialDraft(service.serviceType),
  );
  const [stepIndex, setStepIndex] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const steps = wizardSteps(draft.serviceType);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  const create = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      rememberBookingToken(booking.id, booking.access_token);
      navigate(`/booking/${booking.id}?token=${encodeURIComponent(booking.access_token)}`, {
        replace: true,
      });
    },
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
      navigate(`/book/${serviceByType(patch.serviceType).slug}`, { replace: true });
    }
  }

  function goNext(): void {
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  function goBack(): void {
    if (stepIndex === 0) {
      navigate("/");
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
      case "service":
        return <StepService {...stepProps} />;
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
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
        {service.name}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
        Book your {service.name.toLowerCase()}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">
        No account needed. The booking is created as <strong>Pending review</strong> and the
        Provider confirms it before the service starts.
      </p>

      <div className="mt-8">
        <StepIndicator steps={steps} currentIndex={stepIndex} />
        {renderStep()}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4 text-sm text-ink-500">
        <Button variant="ghost" onClick={() => navigate("/")}>
          Cancel and return home
        </Button>
      </div>
    </div>
  );
}

export default function BookingWizardPage() {
  const { serviceSlug } = useParams();
  const service = serviceBySlug(serviceSlug);

  if (!service) return <UnknownService />;
  return <BookingWizard service={service} />;
}
