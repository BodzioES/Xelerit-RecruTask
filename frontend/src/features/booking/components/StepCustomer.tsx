import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import TextInput from "@/components/ui/TextInput";

import type { WizardStepProps } from "../steps";
import type { CustomerDraft } from "../types";
import WizardFooter from "./WizardFooter";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const customerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter your first name.")
    .max(100, "Use at most 100 characters."),
  lastName: z
    .string()
    .trim()
    .min(1, "Enter your last name.")
    .max(100, "Use at most 100 characters."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your e-mail address.")
    .max(320, "Use at most 320 characters.")
    .regex(EMAIL_PATTERN, "Enter a valid e-mail address."),
  phone: z
    .string()
    .trim()
    .min(5, "Enter a phone number we can reach you on.")
    .max(40, "Use at most 40 characters."),
  notes: z.string().max(2000, "Use at most 2000 characters."),
});

export default function StepCustomer({ draft, onChange, onNext, onBack }: WizardStepProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CustomerDraft>({
    resolver: zodResolver(customerSchema),
    defaultValues: draft.customer,
    mode: "onTouched",
  });

  useEffect(() => {
    // Keep the wizard draft in sync so going back never loses typed data.
    const subscription = watch((values) => {
      onChangeRef.current({
        customer: {
          firstName: values.firstName ?? "",
          lastName: values.lastName ?? "",
          email: values.email ?? "",
          phone: values.phone ?? "",
          notes: values.notes ?? "",
        },
      });
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  function submit(): void {
    onNext();
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="space-y-6">
      <Panel
        title="Your details"
        description="We only use these details to confirm the booking and contact you about the service. No account is needed."
      >
        <input type="hidden" {...register("notes")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="First name"
            autoComplete="given-name"
            required
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <TextInput
            label="Last name"
            autoComplete="family-name"
            required
            error={errors.lastName?.message}
            {...register("lastName")}
          />
          <TextInput
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            hint="The booking confirmation number is shown on the next page."
            error={errors.email?.message}
            {...register("email")}
          />
          <TextInput
            label="Phone"
            type="tel"
            autoComplete="tel"
            required
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>
      </Panel>

      {Object.keys(errors).length > 0 ? (
        <Notice tone="error">Check the highlighted fields before continuing.</Notice>
      ) : null}

      <WizardFooter
        onBack={onBack}
        submitLabel="Review booking"
        hint="Your details are stored only for this booking."
      />
    </form>
  );
}
