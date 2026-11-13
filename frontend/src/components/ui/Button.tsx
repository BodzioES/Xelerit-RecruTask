import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700",
  secondary:
    "border border-slate-300 bg-white text-ink-700 hover:border-brand-200 hover:text-brand-700",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
};

export function buttonClassName(variant: Variant = "primary", className = ""): string {
  return `${base} ${variants[variant]} ${className}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  isLoading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || isLoading}
      className={buttonClassName(variant, className)}
      aria-busy={isLoading || undefined}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
