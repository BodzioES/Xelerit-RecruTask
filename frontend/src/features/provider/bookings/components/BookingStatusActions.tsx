import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import TextArea from "@/components/ui/TextArea";
import { errorMessage } from "@/lib/errors";
import type { Booking, BookingStatus } from "@/types/api";

import { dashboardKeys } from "../../dashboard/api";
import { providerBookingKeys, updateBookingStatus } from "../api";
import { statusActions } from "../transitions";

type Props = {
  booking: Booking;
};

export default function BookingStatusActions({ booking }: Props) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const actions = statusActions(booking);

  const mutation = useMutation({
    mutationFn: (status: BookingStatus) =>
      updateBookingStatus(booking.id, status, note.trim() || null),
    onSuccess: (updated) => {
      setNote("");
      queryClient.setQueryData(providerBookingKeys.detail(booking.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["provider", "bookings", "list"] });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.overview });
    },
  });

  return (
    <Panel title="Status" description="Only transitions allowed by the booking flow are shown.">
      {actions.length === 0 ? (
        <Notice>This booking is closed. No further status changes are possible.</Notice>
      ) : (
        <div className="space-y-4">
          <TextArea
            label="Note for the history (optional)"
            value={note}
            maxLength={1000}
            hint="The note is visible to the customer in the booking history."
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.variant}
                disabled={mutation.isPending}
                isLoading={mutation.isPending && mutation.variables === action.status}
                onClick={() => mutation.mutate(action.status)}
              >
                {action.label}
              </Button>
            ))}
          </div>
          {mutation.isError ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}
        </div>
      )}
    </Panel>
  );
}
