import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <img
            src="/janusztrans-logo.png"
            alt=""
            aria-hidden="true"
            className="h-10 w-auto shrink-0"
          />
          <span className="text-lg font-semibold tracking-tight text-ink-900">JanuszTrans</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6 text-sm text-ink-500">
          <Link className="transition hover:text-ink-900" to="/#services">
            Choose a service
          </Link>
          <Link className="transition hover:text-ink-900" to="/#contact">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
