import { Link } from "react-router-dom";

import { buttonClassName } from "@/components/ui/Button";

const NAV_LINKS = [
  { label: "How it works", to: "/#how-it-works" },
  { label: "Choose a service", to: "/#services" },
  { label: "Pricing", to: "/#pricing" },
  { label: "Contact", to: "/#contact" },
];

function NavLinks({ className }: { className: string }) {
  return (
    <nav aria-label="Main sections" className={className}>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="whitespace-nowrap rounded-lg px-3 py-2 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <img
              src="/janusztrans-logo.png"
              alt=""
              aria-hidden="true"
              className="h-11 w-auto shrink-0"
            />
            <span className="text-xl font-bold tracking-tight text-ink-900">JanuszTrans</span>
          </Link>

          <div className="flex items-center gap-2">
            <NavLinks className="hidden items-center gap-1 text-sm font-semibold text-ink-700 md:flex" />
            <Link
              to="/#services"
              className={buttonClassName("primary", "hidden font-semibold md:inline-flex")}
            >
              Book a van
            </Link>
          </div>
        </div>

        <NavLinks className="-mx-1 flex gap-1 overflow-x-auto pb-2 text-sm font-semibold text-ink-700 md:hidden" />
      </div>
    </header>
  );
}
