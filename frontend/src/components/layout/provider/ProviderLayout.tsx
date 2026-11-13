import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";

import ProviderNav from "@/components/layout/provider/ProviderNav";
import { fetchProviderProfile, providerAuthKeys } from "@/features/provider/auth/api";

/** Provider shell: its own navigation instead of the customer header and footer. */
export default function ProviderLayout() {
  const profile = useQuery({
    queryKey: providerAuthKeys.me,
    queryFn: fetchProviderProfile,
  });

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {profile.data ? <ProviderNav profile={profile.data} /> : null}
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
