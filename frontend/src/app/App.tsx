import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import LoadingState from "@/components/ui/LoadingState";

const HomePage = lazy(() => import("@/pages/HomePage"));
const BookingWizardPage = lazy(() => import("@/pages/BookingWizardPage"));
const BookingStatusPage = lazy(() => import("@/pages/BookingStatusPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
          <LoadingState label="Loading page" rows={2} />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <Page>
              <HomePage />
            </Page>
          }
        />
        <Route
          path="book/:serviceSlug"
          element={
            <Page>
              <BookingWizardPage />
            </Page>
          }
        />
        <Route
          path="booking/:bookingId"
          element={
            <Page>
              <BookingStatusPage />
            </Page>
          }
        />
        <Route
          path="*"
          element={
            <Page>
              <NotFoundPage />
            </Page>
          }
        />
      </Route>
    </Routes>
  );
}
