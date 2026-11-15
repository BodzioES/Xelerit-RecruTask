import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import TextArea from "@/components/ui/TextArea";
import type { BookingDraft } from "@/features/booking/types";
import { errorMessage } from "@/lib/errors";
import { serviceByType } from "@/lib/services";

import { assistantKeys, fetchAssistantStatus, requestMovePlan, type MovePlan } from "../api";
import { draftPatchFromPlan } from "../applyPlan";

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

type Props = {
  draft: BookingDraft;
  onChange: (patch: Partial<BookingDraft>) => void;
};

export default function MoveAssistantPanel({ draft, onChange }: Props) {
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<MovePlan | null>(null);
  const status = useQuery({
    queryKey: assistantKeys.status,
    queryFn: fetchAssistantStatus,
    staleTime: Infinity,
    retry: false,
  });

  const serviceType = draft.serviceType === "full_moving" ? "full_moving" : "van_driver";
  const mutation = useMutation({
    mutationFn: () => requestMovePlan(description.trim(), serviceType),
    onSuccess: (result) => {
      setPlan(result);
      onChange(draftPatchFromPlan(draft, result));
    },
  });

  // Without an AI key on the server the assistant simply does not appear.
  if (!status.data?.enabled) return null;

  const suggested = plan?.suggested_service ?? null;
  const tooShort = description.trim().length < MIN_LENGTH;

  return (
    <Panel
      title="Describe your move (AI)"
      description="Write in your own words what we move and from where. The assistant fills in the form below. Check every field, and the price is still calculated by us."
    >
      <div className="space-y-3">
        <TextArea
          label="Your description"
          value={description}
          maxLength={MAX_LENGTH}
          placeholder="E.g. a 2-room flat on the 3rd floor without a lift: sofa, wardrobe, fridge, washing machine and about 20 boxes."
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button
          variant="secondary"
          disabled={tooShort}
          isLoading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Fill in with AI
        </Button>

        {mutation.isError ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}
        {plan && !mutation.isError ? (
          <Notice tone="success" title="Form filled in">
            {plan.summary} Review the fields below before you continue.
          </Notice>
        ) : null}
        {suggested && suggested !== draft.serviceType ? (
          <Notice tone="info" title={`${serviceByType(suggested).name} may suit you better`}>
            <span className="block">Based on your description we would suggest this service.</span>
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
    </Panel>
  );
}
