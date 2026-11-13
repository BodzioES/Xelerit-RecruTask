import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import TextArea from "@/components/ui/TextArea";
import { formatDateTime } from "@/lib/datetime";
import { errorMessage } from "@/lib/errors";
import type { Booking } from "@/types/api";

import {
  fetchProviderHandoverOrNull,
  providerBookingKeys,
  saveProviderHandover,
} from "../api";

const CLOSED: ReadonlySet<Booking["status"]> = new Set(["cancelled", "rejected"]);

type Props = {
  booking: Booking;
};

export default function HandoverEditor({ booking }: Props) {
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState("");
  const [returnInfo, setReturnInfo] = useState("");
  const [generateCode, setGenerateCode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handover = useQuery({
    queryKey: providerBookingKeys.handover(booking.id),
    queryFn: () => fetchProviderHandoverOrNull(booking.id),
    retry: false,
  });

  const record = handover.data;

  useEffect(() => {
    if (!record) return;
    setPickup(record.pickup_instructions ?? "");
    setReturnInfo(record.return_instructions ?? "");
  }, [record]);

  const mutation = useMutation({
    mutationFn: () =>
      saveProviderHandover(booking.id, {
        generate_code: generateCode,
        pickup_instructions: pickup.trim() || null,
        return_instructions: returnInfo.trim() || null,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(providerBookingKeys.handover(booking.id), result);
      setGenerateCode(false);
      setSaved(true);
    },
  });

  if (CLOSED.has(booking.status)) {
    return (
      <Panel title="Pickup and handover">
        <Notice>Handover details cannot be prepared for a closed booking.</Notice>
      </Panel>
    );
  }

  return (
    <Panel
      title="Pickup and handover"
      description="Prepare the lockbox code and instructions for the customer."
    >
      {handover.isPending ? <LoadingState label="Loading handover details" rows={1} /> : null}

      {handover.isError ? (
        <ErrorState
          message={errorMessage(handover.error)}
          onRetry={() => {
            void handover.refetch();
          }}
        />
      ) : null}

      {handover.data !== undefined ? (
        <div className="space-y-4">
          {record?.access_code ? (
            <Notice tone="success" title="Access code">
              <span className="font-mono text-lg tracking-[0.3em]">{record.access_code}</span>
              {record.code_generated_at ? (
                <span className="mt-1 block text-xs">
                  Generated {formatDateTime(record.code_generated_at)}. The customer sees it once
                  the booking is ready for pickup.
                </span>
              ) : null}
            </Notice>
          ) : null}

          <TextArea
            label="Pickup instructions"
            value={pickup}
            maxLength={2000}
            hint="Where to find the van and the lockbox."
            onChange={(event) => {
              setPickup(event.target.value);
              setSaved(false);
            }}
          />
          <TextArea
            label="Return instructions"
            value={returnInfo}
            maxLength={2000}
            hint="Where and how to return the vehicle."
            onChange={(event) => {
              setReturnInfo(event.target.value);
              setSaved(false);
            }}
          />

          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              checked={generateCode}
              onChange={(event) => {
                setGenerateCode(event.target.checked);
                setSaved(false);
              }}
            />
            <span>
              Generate a new six-digit access code
              <span className="block text-xs text-ink-500">
                This replaces the current code. Leave unchecked to keep it.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
              Save handover details
            </Button>
            {saved ? <p className="text-sm text-emerald-700">Handover details saved.</p> : null}
          </div>

          {mutation.isError ? (
            <Notice tone="error">{errorMessage(mutation.error)}</Notice>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
