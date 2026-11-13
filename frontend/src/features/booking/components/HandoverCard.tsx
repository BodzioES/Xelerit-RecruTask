import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import { bookingKeys, fetchHandover } from "@/features/booking/api";
import { formatDateTime } from "@/lib/datetime";
import { errorMessage, isForbidden, isNotFound } from "@/lib/errors";

type Props = {
  bookingId: string;
  token: string;
};

export default function HandoverCard({ bookingId, token }: Props) {
  const handover = useQuery({
    queryKey: bookingKeys.handover(bookingId, token),
    queryFn: () => fetchHandover(bookingId, token),
    retry: false,
  });

  return (
    <Panel
      title="Key handover"
      description="The van opens with a lockbox code. Only you can see it on this page."
      actions={
        <Button
          variant="secondary"
          isLoading={handover.isFetching}
          onClick={() => {
            void handover.refetch();
          }}
        >
          Refresh
        </Button>
      }
    >
      {handover.isPending ? <LoadingState label="Loading handover details" rows={1} /> : null}

      {isNotFound(handover.error) ? (
        <Notice>
          The key code is not prepared yet. It appears here as soon as we prepare the van — usually
          shortly before pickup.
        </Notice>
      ) : null}

      {isForbidden(handover.error) ? (
        <Notice>
          The key code becomes visible when the booking is ready for pickup.
        </Notice>
      ) : null}

      {handover.isError && !isNotFound(handover.error) && !isForbidden(handover.error) ? (
        <ErrorState
          message={errorMessage(handover.error)}
          onRetry={() => {
            void handover.refetch();
          }}
        />
      ) : null}

      {handover.isSuccess ? (
        <div className="space-y-4">
          {handover.data.access_code ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-700">
                Lockbox code
              </p>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.3em] text-ink-900">
                {handover.data.access_code}
              </p>
              {handover.data.code_generated_at ? (
                <p className="mt-1 text-xs text-ink-500">
                  Prepared {formatDateTime(handover.data.code_generated_at)}
                </p>
              ) : null}
            </div>
          ) : (
            <Notice>The code will appear here once we prepare the van.</Notice>
          )}

          {handover.data.pickup_instructions ? (
            <div>
              <p className="text-sm font-medium text-ink-900">Pickup</p>
              <p className="mt-1 text-sm text-ink-700">{handover.data.pickup_instructions}</p>
            </div>
          ) : null}

          {handover.data.return_instructions ? (
            <div>
              <p className="text-sm font-medium text-ink-900">Return</p>
              <p className="mt-1 text-sm text-ink-700">{handover.data.return_instructions}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
