import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import TextInput from "@/components/ui/TextInput";
import { errorMessage } from "@/lib/errors";
import { serviceByType } from "@/lib/services";
import type { PricingRule } from "@/types/api";

import { pricingRuleKeys, updatePricingRule, type PricingRuleUpdate } from "../api";

const MONEY_FIELDS = [
  { key: "base_price", label: "Base service fee (PLN)" },
  { key: "hourly_rate", label: "Hourly rate (PLN)" },
  { key: "daily_rate", label: "Daily rate (PLN)" },
  { key: "price_per_km", label: "Price per km (PLN)" },
  { key: "helper_rate", label: "Helper rate (PLN per helper)" },
  { key: "floor_surcharge", label: "Floor surcharge (PLN per floor)" },
  { key: "no_elevator_surcharge", label: "No-elevator surcharge (PLN)" },
  { key: "additional_service_price", label: "Additional service (PLN)" },
] as const;

type MoneyField = (typeof MONEY_FIELDS)[number]["key"];
type RuleValues = Record<MoneyField, string> & { min_duration_hours: string };

function initialValues(rule: PricingRule): RuleValues {
  return {
    base_price: rule.base_price,
    hourly_rate: rule.hourly_rate,
    daily_rate: rule.daily_rate,
    price_per_km: rule.price_per_km,
    helper_rate: rule.helper_rate,
    floor_surcharge: rule.floor_surcharge,
    no_elevator_surcharge: rule.no_elevator_surcharge,
    additional_service_price: rule.additional_service_price,
    min_duration_hours: String(rule.min_duration_hours),
  };
}

function round2(value: string): string {
  return String(Math.round(Number(value) * 100) / 100);
}

function validationError(values: RuleValues): string | null {
  for (const field of MONEY_FIELDS) {
    const raw = values[field.key].trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value) || value < 0) {
      return `${field.label}: enter a value of 0 or more.`;
    }
  }
  const minimum = Number(values.min_duration_hours);
  if (!Number.isInteger(minimum) || minimum < 1 || minimum > 168) {
    return "Minimum duration must be a whole number between 1 and 168 hours.";
  }
  return null;
}

function toInput(values: RuleValues): PricingRuleUpdate {
  return {
    base_price: round2(values.base_price),
    hourly_rate: round2(values.hourly_rate),
    daily_rate: round2(values.daily_rate),
    price_per_km: round2(values.price_per_km),
    helper_rate: round2(values.helper_rate),
    floor_surcharge: round2(values.floor_surcharge),
    no_elevator_surcharge: round2(values.no_elevator_surcharge),
    additional_service_price: round2(values.additional_service_price),
    min_duration_hours: Number(values.min_duration_hours),
  };
}

type Props = {
  rule: PricingRule;
};

export default function PricingRuleForm({ rule }: Props) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<RuleValues>(initialValues(rule));
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const service = serviceByType(rule.service_type);

  const mutation = useMutation({
    mutationFn: (input: PricingRuleUpdate) => updatePricingRule(rule.service_type, input),
    onSuccess: (updated) => {
      setValues(initialValues(updated));
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: pricingRuleKeys.list });
    },
  });

  function update(field: keyof RuleValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function submit(): void {
    const error = validationError(values);
    setFormError(error);
    if (error) return;
    mutation.mutate(toInput(values));
  }

  return (
    <Panel title={`${service.name} pricing`}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MONEY_FIELDS.map((field) => (
            <TextInput
              key={field.key}
              label={field.label}
              inputMode="decimal"
              required
              value={values[field.key]}
              onChange={(event) => update(field.key, event.target.value)}
            />
          ))}
          <TextInput
            label="Minimum duration (hours)"
            inputMode="numeric"
            required
            hint="The shortest billable service window."
            value={values.min_duration_hours}
            onChange={(event) => update("min_duration_hours", event.target.value)}
          />
        </div>

        {formError ? <Notice tone="error">{formError}</Notice> : null}
        {mutation.isError ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}
        {saved ? <p className="text-sm text-emerald-700">Pricing rules saved.</p> : null}

        <Button type="submit" isLoading={mutation.isPending}>
          Save pricing rules
        </Button>
      </form>
    </Panel>
  );
}
