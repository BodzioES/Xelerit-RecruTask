import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PageBoundary from "@/app/PageBoundary";
import ProviderLayout from "@/components/layout/provider/ProviderLayout";
import ProtectedProviderRoute from "@/features/provider/auth/ProtectedProviderRoute";

const ProviderLoginPage = lazy(() => import("@/pages/provider/ProviderLoginPage"));
const ProviderDashboardPage = lazy(() => import("@/pages/provider/ProviderDashboardPage"));
const ProviderBookingsPage = lazy(() => import("@/pages/provider/ProviderBookingsPage"));
const ProviderBookingPage = lazy(() => import("@/pages/provider/ProviderBookingPage"));
const ProviderVehiclesPage = lazy(() => import("@/pages/provider/ProviderVehiclesPage"));
const ProviderEmployeesPage = lazy(() => import("@/pages/provider/ProviderEmployeesPage"));
const ProviderPricingPage = lazy(() => import("@/pages/provider/ProviderPricingPage"));

export default function ProviderApp() {
  return (
    <Routes>
      <Route
        path="login"
        element={
          <PageBoundary>
            <ProviderLoginPage />
          </PageBoundary>
        }
      />

      <Route element={<ProtectedProviderRoute />}>
        <Route element={<ProviderLayout />}>
          <Route
            index
            element={
              <PageBoundary>
                <ProviderDashboardPage />
              </PageBoundary>
            }
          />
          <Route
            path="bookings"
            element={
              <PageBoundary>
                <ProviderBookingsPage />
              </PageBoundary>
            }
          />
          <Route
            path="bookings/:bookingId"
            element={
              <PageBoundary>
                <ProviderBookingPage />
              </PageBoundary>
            }
          />
          <Route
            path="vehicles"
            element={
              <PageBoundary>
                <ProviderVehiclesPage />
              </PageBoundary>
            }
          />
          <Route
            path="employees"
            element={
              <PageBoundary>
                <ProviderEmployeesPage />
              </PageBoundary>
            }
          />
          <Route
            path="pricing"
            element={
              <PageBoundary>
                <ProviderPricingPage />
              </PageBoundary>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/provider" replace />} />
    </Routes>
  );
}
