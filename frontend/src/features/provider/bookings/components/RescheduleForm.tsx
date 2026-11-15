import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import TextInput from "@/components/ui/TextInput";
import { localDateValue, localTimeValue, toIsoFromLocal } from "@/lib/datetime";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import type { Booking } from "@/types/api";

import { dashboardKeys } from "../../dashboard/api";
import { providerBookingKeys, rescheduleBooking } from "../api";

const RESCHEDULABLE = new Set<Booking["status"]>(["pending", "confirmed", "ready_for_pickup"]);

type Props = {
  booking: Booking;
};

function localParts(iso: string): { date: string; time: string } {
  const value = new Date(iso);
  return { date: localDateValue(value), time: localTimeValue(value) };
}

export default function RescheduleForm({ booking }: Props) {
  const queryClient = useQueryClient();
  const [start, setStart] = useState(() => localParts(booking.start_datetime));
  const [end, setEnd] = useState(() => localParts(booking.end_datetime));
  const [formError, setFormError] = useState<string | null>(null);
  const [savedPrice, setSavedPrice] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ startIso, endIso }: { startIso: string; endIso: string }) =>
      rescheduleBooking(booking.id, startIso, endIso),
    onSuccess: (updated) => {
      setSavedPrice(updated.total_price);
      queryClient.setQueryData(providerBookingKeys.detail(booking.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["provider", "bookings", "list"] });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.overview });
    },
  });

  if (!RESCHEDULABLE.has(booking.status)) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSavedPrice(null);
    const startIso = toIsoFromLocal(start.date, start.time);
    const endIso = toIsoFromLocal(end.date, end.time);
    if (!startIso || !endIso) {
      setFormError("Enter both the new start and the new end.");
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      setFormError("The end must be after the start.");
      return;
    }
    setFormError(null);
    mutation.mutate({ startIso, endIso });
  }

  return (
    <Panel
      title="Change date and time"
      description="The vehicle and crew stay the same. The server checks they are free and recalculates the price."
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Start date"
            type="date"
            required
            value={start.date}
            onChange={(event) => setStart({ ...start, date: event.target.value })}
          />
          <TextInput
            label="Start time"
            type="time"
            required
            value={start.time}
            onChange={(event) => setStart({ ...start, time: event.target.value })}
          />
          <TextInput
            label="End date"
            type="date"
            required
            value={end.date}
            onChange={(event) => setEnd({ ...end, date: event.target.value })}
          />
          <TextInput
            label="End time"
            type="time"
            required
            value={end.time}
            onChange={(event) => setEnd({ ...end, time: event.target.value })}
          />
        </div>

        {formError ? <Notice tone="error">{formError}</Notice> : null}
        {mutation.isError ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}
        {savedPrice ? (
          <Notice tone="success">Rescheduled. The new price is {formatMoney(savedPrice)}.</Notice>
        ) : null}

        <Button type="submit" variant="secondary" isLoading={mutation.isPending}>
          Save new time
        </Button>
      </form>
    </Panel>
  );
}
