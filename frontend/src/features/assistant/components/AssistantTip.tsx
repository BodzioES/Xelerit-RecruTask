import { useAssistantEnabled } from "../useAssistantEnabled";
import AiBadge from "./AiBadge";

type Props = {
  children: string;
};

/** A short announcement of the AI assistant, hidden when the server has no AI key. */
export default function AssistantTip({ children }: Props) {
  if (!useAssistantEnabled()) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
      <AiBadge />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
