import { Suspense, type ReactNode } from "react";

import LoadingState from "@/components/ui/LoadingState";

type Props = {
  children: ReactNode;
};

/** Shared lazy-route fallback for the customer and provider route trees. */
export default function PageBoundary({ children }: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <LoadingState label="Loading page" rows={2} />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
