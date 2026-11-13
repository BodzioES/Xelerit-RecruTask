import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";

type Props = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorState({ message, onRetry, retryLabel = "Try again" }: Props) {
  return (
    <div className="space-y-3">
      <Notice tone="error">{message}</Notice>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
