import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import { bookingKeys, fetchQuote } from "@/features/booking/api";
import { errorMessage } from "@/lib/errors";

import { draftEndIso, draftStartIso, quoteRequestFromDraft } from "../draft";
import type { WizardStepProps } from "../steps";
import QuoteBreakdown from "./QuoteBreakdown";
import WizardFooter from "./WizardFooter";

export default function StepQuote({ draft, onNext, onBack }: WizardStepProps) {
  const [showRequestError, setShowRequestError] = useState(false);
  const startIso = draftStartIso(draft);
  const endIso = draftEndIso(draft);
  const request = startIso && endIso ? quoteRequestFromDraft(draft, startIso, endIso) : null;

  const quote = useQuery({
    queryKey: request ? bookingKeys.quote(request) : (["pricing", "quote", "incomplete"] as const),
    queryFn: () => {
      if (!request) throw new Error("The booking window is incomplete");
      return fetchQuote(request);
    },
    enabled: request !== null,
    retry: false,
    staleTime: 30_000,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!quote.isSuccess) {
      setShowRequestError(true);
      return;
    }
    setShowRequestError(false);
    onNext();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <Panel
        title="Your quote"
        description="Calculated by the server from the current pricing rules. The final price is confirmed when you place the booking."
        actions={
          quote.isSuccess ? (
            <Button
              variant="secondary"
              isLoading={quote.isFetching}
              onClick={() => {
                void quote.refetch();
              }}
            >
              Refresh
            </Button>
          ) : null
        }
      >
        {!request ? (
          <Notice tone="error">
            Choose the date and both locations before we can calculate a price.
          </Notice>
        ) : null}

        {request && quote.isPending ? (
          <LoadingState label="Calculating your quote" rows={2} />
        ) : null}

        {request && quote.isError ? (
          <ErrorState
            message={errorMessage(quote.error)}
            onRetry={() => {
              void quote.refetch();
            }}
          />
        ) : null}

        {quote.isSuccess ? <QuoteBreakdown quote={quote.data} /> : null}
      </Panel>

      {showRequestError && !quote.isSuccess ? (
        <Notice tone="error">We need a current quote before you can continue.</Notice>
      ) : null}

      <WizardFooter
        onBack={onBack}
        submitLabel="Continue"
        hint="The price is recalculated by the server when the booking is created."
        disabled={quote.isPending}
      />
    </form>
  );
}
