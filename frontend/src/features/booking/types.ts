import type { PropertyType, ServiceType } from "@/types/api";

export type DraftLocation = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  inServiceArea: boolean | null;
};

export type DraftItem = {
  /** Stable client-side key; never sent to the API. */
  key: string;
  itemName: string;
  quantity: string;
  description: string;
};

export type MovingDetailsDraft = {
  propertyType: PropertyType;
  floor: string;
  elevator: "" | "yes" | "no";
  needsCarryIn: boolean;
  needsCarryOut: boolean;
  boxesCount: string;
  itemsDescription: string;
};

export type CustomerDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
};

export type BookingDraft = {
  serviceType: ServiceType;
  startDate: string;
  startTime: string;
  durationHours: number;
  endDate: string;
  endTime: string;
  pickup: DraftLocation;
  returnLocation: DraftLocation;
  loading: DraftLocation;
  unloading: DraftLocation;
  vehicleId: string | null;
  vehicleLabel: string | null;
  helpers: number;
  items: DraftItem[];
  movingDetails: MovingDetailsDraft;
  additionalService: boolean;
  customer: CustomerDraft;
};

export type CoordinatePoint = {
  latitude: number;
  longitude: number;
};

export type QuoteRequest = {
  service_type: ServiceType;
  start_datetime: string;
  end_datetime: string;
  vehicle_id: string | null;
  helpers: number;
  floor: number | null;
  has_elevator: boolean | null;
  additional_service: boolean;
  origin: CoordinatePoint | null;
  destination: CoordinatePoint | null;
};

export type CreateBookingRequest = {
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  service_type: ServiceType;
  start_datetime: string;
  end_datetime: string;
  vehicle_id: string | null;
  helpers: number;
  additional_service: boolean;
  customer_notes: string | null;
  locations: Array<{
    location_type: "pickup" | "return" | "loading" | "unloading";
    address: string;
    latitude: number;
    longitude: number;
    place_id: string | null;
  }>;
  items: Array<{ item_name: string; quantity: number; description: string | null }>;
  moving_details: {
    property_type: PropertyType;
    floor: number | null;
    has_elevator: boolean | null;
    needs_carry_in: boolean;
    needs_carry_out: boolean;
    boxes_count: number | null;
    items_description: string | null;
  } | null;
};

export const PROPERTY_TYPE_OPTIONS: ReadonlyArray<{ value: PropertyType; label: string }> = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "hall", label: "Hall" },
  { value: "retail", label: "Retail unit" },
  { value: "other", label: "Other" },
];

/** Property types where a floor and an elevator question make sense. */
export const FLOOR_PROPERTY_TYPES: ReadonlySet<PropertyType> = new Set([
  "apartment",
  "office",
  "retail",
]);
