import { Link, useParams } from "react-router-dom";

const serviceNames: Record<string, string> = {
  "self-drive": "Self Drive",
  "van-driver": "Van + Driver",
  "full-moving": "Full Moving",
};

export default function OrderPlaceholderPage() {
  const { serviceType } = useParams();
  const name = serviceType ? serviceNames[serviceType] : undefined;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
        Booking wizard
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">
        {name ?? "Unknown service"}
      </h1>
      <p className="mt-4 text-ink-500">
        The step-by-step booking flow is being implemented in the next milestone.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex w-fit items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
      >
        Back to home
      </Link>
    </div>
  );
}
