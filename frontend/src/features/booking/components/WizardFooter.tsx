import Button from "@/components/ui/Button";

type Props = {
  onBack: () => void;
  submitLabel?: string;
  hint?: string;
  disabled?: boolean;
  isBusy?: boolean;
};

export default function WizardFooter({
  onBack,
  submitLabel = "Continue",
  hint,
  disabled = false,
  isBusy = false,
}: Props) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="secondary" onClick={onBack}>
        Back
      </Button>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        {hint ? <p className="text-xs text-ink-500 sm:text-right">{hint}</p> : null}
        <Button type="submit" disabled={disabled} isLoading={isBusy}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
