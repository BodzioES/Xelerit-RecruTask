import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import TextArea from "@/components/ui/TextArea";
import { bookingKeys, cancelBooking } from "@/features/booking/api";
import { errorMessage } from "@/lib/errors";

type Props = {
  bookingId: string;
  token: string;
};

export default function CancelBookingPanel({ bookingId, token }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const cancel = useMutation({
    mutationFn: () => cancelBooking(bookingId, token, reason.trim() ? reason.trim() : null),
    onSuccess: () => {
      setOpen(false);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId, token) });
    },
  });

  if (!open) {
    return (
      <Panel title="Cancel booking" description="You can cancel until the service starts.">
        <Button variant="danger" onClick={() => setOpen(true)}>
          Cancel this booking
        </Button>
      </Panel>
    );
  }

  return (
    <Panel title="Cancel booking" description="This cannot be undone.">
      <div className="space-y-3">
        <TextArea
          label="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={1000}
          placeholder="Tell us why you are cancelling."
        />

        {cancel.isError ? <Notice tone="error">{errorMessage(cancel.error)}</Notice> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            isLoading={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            Confirm cancellation
          </Button>
          <Button
            variant="secondary"
            disabled={cancel.isPending}
            onClick={() => {
              setOpen(false);
              cancel.reset();
            }}
          >
            Keep booking
          </Button>
        </div>
      </div>
    </Panel>
  );
}
