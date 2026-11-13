import Panel from "@/components/ui/Panel";
import { statusLabels } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/datetime";
import type { BookingActor, BookingEvent } from "@/types/api";

const ACTOR_LABELS: Record<BookingActor, string> = {
  customer: "You",
  provider: "MoveIt",
  system: "System",
};

type Props = {
  events: BookingEvent[];
};

export default function BookingTimeline({ events }: Props) {
  return (
    <Panel title="Progress" description="Every status change is recorded here.">
      <ol className="space-y-4">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500"
            />
            <div>
              <p className="text-sm font-medium text-ink-900">
                {statusLabels[event.new_status]}
              </p>
              <p className="text-xs text-ink-500">
                {formatDateTime(event.created_at)} · {ACTOR_LABELS[event.changed_by]}
              </p>
              {event.note ? <p className="mt-1 text-sm text-ink-700">{event.note}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
