import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col justify-center px-4 py-24 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-600">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900">Page not found</h1>
      <p className="mt-4 text-ink-500">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="mt-8 inline-flex w-fit items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Back to home
      </Link>
    </div>
  );
}
