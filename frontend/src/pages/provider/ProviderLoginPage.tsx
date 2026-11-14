import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import LoginForm from "@/features/provider/auth/components/LoginForm";
import { readProviderToken } from "@/features/provider/auth/session";

type LoginState = { from?: string } | null;

export default function ProviderLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LoginState)?.from;
  const target = from?.startsWith("/provider") ? from : "/provider";

  if (readProviderToken()) {
    return <Navigate to={target} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <span className="text-lg font-semibold tracking-tight text-ink-900">JanuszTrans</span>
          </Link>
          <span className="text-sm font-medium text-ink-500">Provider panel</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Sign in</h1>
          <p className="mt-2 text-sm text-ink-500">
            Use the company account to manage bookings, the fleet and the team.
          </p>
          <div className="mt-6">
            <LoginForm onSuccess={() => navigate(target, { replace: true })} />
          </div>
          <p className="mt-6 text-sm text-ink-500">
            Looking for a booking?{" "}
            <Link to="/" className="font-medium text-brand-700 hover:underline">
              Go to the customer site
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
