import type { ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export default function FieldShell({ id, label, hint, error, required, children }: Props) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-700">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-rose-600">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={descriptionId} className="text-sm text-rose-700">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
