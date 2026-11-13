import Panel from "@/components/ui/Panel";
import SummaryRow from "@/features/booking/components/SummaryRow";
import { formatDateTime } from "@/lib/datetime";
import { formatQuantity } from "@/lib/money";
import { serviceByType } from "@/lib/services";
import type { Booking, LocationType, PropertyType } from "@/types/api";

const LOCATION_LABELS: Record<LocationType, string> = {
  pickup: "Pickup",
  return: "Return",
  loading: "Loading",
  unloading: "Unloading",
};

const PROPERTY_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment",
  house: "House",
  office: "Office",
  warehouse: "Warehouse",
  hall: "Hall",
  retail: "Retail unit",
  other: "Other",
};

type Props = {
  booking: Booking;
};

export default function BookingDetailsPanel({ booking }: Props) {
  const vehicle = booking.vehicle;
  const moving = booking.moving_details;

  return (
    <Panel title="Booking details" description={`Created ${formatDateTime(booking.created_at)}`}>
      <dl className="divide-y divide-slate-100">
        <SummaryRow label="Booking number">{booking.booking_number}</SummaryRow>
        <SummaryRow label="Service">{serviceByType(booking.service_type).name}</SummaryRow>
        <SummaryRow label="Date and time">
          {formatDateTime(booking.start_datetime)} → {formatDateTime(booking.end_datetime)}
        </SummaryRow>
        <SummaryRow label="Vehicle">
          {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.category})` : "Assigned on confirmation"}
        </SummaryRow>
        {booking.locations.map((location) => (
          <SummaryRow key={location.id} label={LOCATION_LABELS[location.location_type]}>
            {location.address}
          </SummaryRow>
        ))}
        {booking.items.length > 0 ? (
          <SummaryRow label="Items">
            {booking.items
              .map((item) => `${item.item_name} ×${formatQuantity(item.quantity)}`)
              .join(", ")}
          </SummaryRow>
        ) : null}
        {moving ? (
          <SummaryRow label="Property">
            {PROPERTY_LABELS[moving.property_type]}
            {moving.floor !== null ? `, floor ${moving.floor}` : ""}
            {moving.floor !== null && moving.floor > 0
              ? moving.has_elevator
                ? ", elevator"
                : ", no elevator"
              : ""}
            {moving.boxes_count !== null ? ` · ${moving.boxes_count} boxes` : ""}
          </SummaryRow>
        ) : null}
        <SummaryRow label="Contact">
          {booking.customer_first_name} {booking.customer_last_name}
          <br />
          {booking.customer_email}
          <br />
          {booking.customer_phone}
        </SummaryRow>
        {booking.customer_notes ? (
          <SummaryRow label="Notes">{booking.customer_notes}</SummaryRow>
        ) : null}
      </dl>
    </Panel>
  );
}
