import { useQuery } from "@tanstack/react-query";

import ProviderPageHeader from "@/components/layout/provider/ProviderPageHeader";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { fetchPricingRules, pricingRuleKeys } from "@/features/provider/pricing/api";
import PricingRuleForm from "@/features/provider/pricing/components/PricingRuleForm";
import { errorMessage } from "@/lib/errors";

export default function ProviderPricingPage() {
  const rules = useQuery({
    queryKey: pricingRuleKeys.list,
    queryFn: fetchPricingRules,
    retry: false,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ProviderPageHeader
        title="Pricing rules"
        description="Rates used by the server for every new quote and booking."
      />

      {rules.isPending ? <LoadingState label="Loading pricing rules" rows={3} /> : null}

      {rules.isError ? (
        <ErrorState
          message={errorMessage(rules.error)}
          onRetry={() => {
            void rules.refetch();
          }}
        />
      ) : null}

      {rules.data?.map((rule) => (
        <PricingRuleForm key={rule.id} rule={rule} />
      ))}
    </div>
  );
}
