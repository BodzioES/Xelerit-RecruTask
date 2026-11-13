import { useId, type TextareaHTMLAttributes } from "react";

import FieldShell from "@/components/ui/FieldShell";
import { controlClassName } from "@/components/ui/controlStyles";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export default function TextArea({ label, hint, error, id, className = "", ...rest }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={rest.required}>
      <textarea
        {...rest}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        className={`${controlClassName(Boolean(error))} min-h-28 resize-y ${className}`}
      />
    </FieldShell>
  );
}
