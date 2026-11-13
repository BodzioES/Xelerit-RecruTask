import { useId, type ReactNode, type SelectHTMLAttributes } from "react";

import FieldShell from "@/components/ui/FieldShell";
import { controlClassName } from "@/components/ui/controlStyles";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export default function SelectInput({
  label,
  hint,
  error,
  id,
  className = "",
  children,
  ...rest
}: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <FieldShell id={selectId} label={label} hint={hint} error={error} required={rest.required}>
      <select
        {...rest}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
        }
        className={`${controlClassName(Boolean(error))} ${className}`}
      >
        {children}
      </select>
    </FieldShell>
  );
}
