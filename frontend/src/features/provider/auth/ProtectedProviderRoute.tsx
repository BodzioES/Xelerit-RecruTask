import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import LoadingState from "@/components/ui/LoadingState";

import { PROVIDER_SESSION_EXPIRED_EVENT } from "../apiClient";
import { fetchProviderProfile, providerAuthKeys } from "./api";
import { readProviderToken } from "./session";

/** Sends anonymous visitors to the login page and ends the session on a 401. */
export default function ProtectedProviderRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = readProviderToken();

  const profile = useQuery({
    queryKey: providerAuthKeys.me,
    queryFn: fetchProviderProfile,
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    const handleExpired = () => {
      navigate("/provider/login", {
        replace: true,
        state: { from: location.pathname },
      });
    };
    window.addEventListener(PROVIDER_SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(PROVIDER_SESSION_EXPIRED_EVENT, handleExpired);
  }, [location.pathname, navigate]);

  if (!token) {
    return <Navigate to="/provider/login" replace state={{ from: location.pathname }} />;
  }

  if (profile.isPending) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <LoadingState label="Checking your session" rows={2} />
      </div>
    );
  }

  if (profile.isError) {
    return <Navigate to="/provider/login" replace />;
  }

  return <Outlet />;
}
