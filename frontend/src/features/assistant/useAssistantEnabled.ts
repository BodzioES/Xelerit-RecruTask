import { useQuery } from "@tanstack/react-query";

import { assistantKeys, fetchAssistantStatus } from "./api";

/** True only when the server has an AI key, so the UI never advertises a missing feature. */
export function useAssistantEnabled(): boolean {
  const status = useQuery({
    queryKey: assistantKeys.status,
    queryFn: fetchAssistantStatus,
    staleTime: Infinity,
    retry: false,
  });
  return status.data?.enabled ?? false;
}
