import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import TextArea from "@/components/ui/TextArea";
import type { BookingDraft } from "@/features/booking/types";
import { errorMessage } from "@/lib/errors";
import { serviceByType } from "@/lib/services";

import { requestMovePlan, type MovePlan } from "../api";
import { draftPatchFromPlan } from "../applyPlan";
import { useAssistantEnabled } from "../useAssistantEnabled";
import AiBadge from "./AiBadge";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

type Props = {
  draft: BookingDraft;
  onChange: (patch: Partial<BookingDraft>) => void;
};

export default function MoveAssistantPanel({ draft, onChange }: Props) {
  const enabled = useAssistantEnabled();
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<MovePlan | null>(null);

  const serviceType = draft.serviceType === "full_moving" ? "full_moving" : "van_driver";
  const mutation = useMutation({
    mutationFn: () => requestMovePlan(description.trim(), serviceType),
    onSuccess: (result) => {
      setPlan(result);
      onChange(draftPatchFromPlan(draft, result));
    },
  });

  // Without an AI key on the server the assistant simply does not appear.
  if (!enabled) return null;

  const suggested = plan?.suggested_service ?? null;
  const tooShort = description.trim().length < MIN_LENGTH;

  return (
    <section
      aria-labelledby="move-assistant-heading"
      className="rounded-2xl border-2 border-violet-300 bg-linear-to-br from-violet-50 to-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <AiBadge />
        <h2 id="move-assistant-heading" className="text-lg font-semibold text-ink-900">
          Let AI fill in this step for you
        </h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">
        Describe your move in your own words, in any language. Our AI assistant fills in the
        property, floor, elevator, boxes and item list below
        {serviceType === "full_moving" ? ", and suggests how many movers you need" : ""}. You
        check every field, and the price is still calculated by us, not by the AI.
      </p>

      <div className="mt-4 space-y-3">
        <TextArea
          label="Your description"
          value={description}
          maxLength={MAX_LENGTH}
          placeholder="E.g. a 2-room flat on the 3rd floor without a lift: sofa, wardrobe, fridge, washing machine and about 20 boxes."
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button
          disabled={tooShort}
          isLoading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Fill in with AI
        </Button>

        {mutation.isError ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}
        {plan && !mutation.isError ? (
          <Notice tone="success" title="Filled in by AI">
            {plan.summary} Review the fields below before you continue.
          </Notice>
        ) : null}
        {suggested && suggested !== draft.serviceType ? (
          <Notice tone="info" title={`${serviceByType(suggested).name} may suit you better`}>
            <span className="block">Based on your description, the AI suggests this service.</span>
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => onChange({ serviceType: suggested })}
            >
              Switch to {serviceByType(suggested).name}
            </Button>
          </Notice>
        ) : null}
      </div>
    </section>
  );
}
