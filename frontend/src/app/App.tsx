import { lazy } from "react";
import { Route, Routes } from "react-router-dom";

import PageBoundary from "@/app/PageBoundary";
import AppLayout from "@/components/layout/AppLayout";

const HomePage = lazy(() => import("@/pages/public/HomePage"));
const BookingWizardPage = lazy(() => import("@/pages/public/BookingWizardPage"));
const BookingStatusPage = lazy(() => import("@/pages/public/BookingStatusPage"));
const NotFoundPage = lazy(() => import("@/pages/public/NotFoundPage"));
const ProviderApp = lazy(() => import("@/app/ProviderApp"));

export default function App() {
  return (
    <Routes>
      {/* The provider panel has its own layout, auth layer and lazy chunk. */}
      <Route
        path="provider/*"
        element={
          <PageBoundary>
            <ProviderApp />
          </PageBoundary>
        }
      />

      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <PageBoundary>
              <HomePage />
            </PageBoundary>
          }
        />
        <Route
          path="book/:serviceSlug"
          element={
            <PageBoundary>
              <BookingWizardPage />
            </PageBoundary>
          }
        />
        <Route
          path="booking/:bookingId"
          element={
            <PageBoundary>
              <BookingStatusPage />
            </PageBoundary>
          }
        />
        <Route
          path="*"
          element={
            <PageBoundary>
              <NotFoundPage />
            </PageBoundary>
          }
        />
      </Route>
    </Routes>
  );
}
