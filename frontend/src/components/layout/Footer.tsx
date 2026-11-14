import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/apiClient";

type HealthResponse = {
  status: string;
  database: string;
};

export default function Footer() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<HealthResponse>("/health/db"),
    refetchInterval: 60_000,
    retry: false,
  });

  return (
    <footer id="contact" className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-medium text-ink-900">JanuszTrans</p>
          <p className="mt-1">Gdańsk · Gdynia · Sopot and up to 30 km around</p>
          <p className="mt-1">
            <a className="transition hover:text-ink-900" href="mailto:hello@janusztrans.pl">
              hello@janusztrans.pl
            </a>
            {" · "}
            <a className="transition hover:text-ink-900" href="tel:+48123456789">
              +48 123 456 789
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${
              health.isSuccess ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          <span>
            {health.isSuccess
              ? "API and database online"
              : health.isError
                ? "API unavailable"
                : "Checking API…"}
          </span>
        </div>
      </div>
    </footer>
  );
}
