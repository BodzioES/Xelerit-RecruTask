import { useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";

import { clearProviderToken } from "@/features/provider/auth/session";
import type { ProviderProfile } from "@/types/api";

const LINKS = [
  { to: "/provider", label: "Dashboard", end: true },
  { to: "/provider/bookings", label: "Bookings", end: false },
  { to: "/provider/vehicles", label: "Fleet", end: false },
  { to: "/provider/employees", label: "Employees", end: false },
  { to: "/provider/pricing", label: "Pricing", end: false },
] as const;

type Props = {
  profile: ProviderProfile;
};

export default function ProviderNav({ profile }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function signOut(): void {
    clearProviderToken();
    queryClient.clear();
    navigate("/provider/login", { replace: true });
  }

  return (
    <aside className="border-b border-slate-200 bg-white lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-5">
        <div>
          <p className="text-sm font-semibold text-ink-900">JanuszTrans</p>
          <p className="text-xs text-ink-500">Provider panel</p>
        </div>
      </div>

      <nav
        aria-label="Provider"
        className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3"
      >
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:bg-slate-50 hover:text-ink-900"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-slate-200 p-4 lg:mt-auto lg:block">
        <p className="text-sm font-medium text-ink-900">
          {profile.first_name} {profile.last_name}
        </p>
        <p className="truncate text-xs text-ink-500">{profile.email}</p>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
        >
          Sign out
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 lg:hidden">
        <p className="truncate text-sm text-ink-500">{profile.email}</p>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-ink-700"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
