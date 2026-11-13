export type ServiceType = "self_drive" | "van_driver" | "full_moving";
export type LocationType = "pickup" | "return" | "loading" | "unloading";
export type EmployeeRole = "driver" | "mover";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "ready_for_pickup"
  | "in_progress"
  | "completed"
  | "rejected"
  | "cancelled";

export type BookingActor = "provider" | "customer" | "system";

export type PropertyType =
  | "apartment"
  | "house"
  | "office"
  | "warehouse"
  | "hall"
  | "retail"
  | "other";

/** The API serializes decimal values as strings to avoid float rounding. */
export type DecimalString = string;

export type LocationSuggestion = {
  address: string;
  latitude: DecimalString;
  longitude: DecimalString;
  place_id: string | null;
  city: string | null;
  country: string | null;
  in_service_area: boolean;
  distance_from_center_km: DecimalString;
};

export type ServiceAreaStatus = {
  latitude: DecimalString;
  longitude: DecimalString;
  in_service_area: boolean;
  distance_from_center_km: DecimalString;
  radius_km: DecimalString;
};

export type AvailableVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  cargo_volume: DecimalString;
  payload: number;
  seats: number;
  description: string | null;
  image_url: string | null;
  hourly_price: DecimalString;
  daily_price: DecimalString;
};

export type AvailableEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
};

export type QuoteLine = {
  code: string;
  description: string;
  quantity: DecimalString;
  unit_price: DecimalString;
  amount: DecimalString;
};

export type Quote = {
  service_type: ServiceType;
  currency: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  billable_hours: number;
  distance_km: DecimalString;
  vehicle_id: string | null;
  helpers: number;
  lines: QuoteLine[];
  total: DecimalString;
};

export type BookingVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  cargo_volume: DecimalString;
  payload: number;
  seats: number;
  image_url: string | null;
};

export type BookingLocation = {
  id: string;
  location_type: LocationType;
  address: string;
  latitude: DecimalString;
  longitude: DecimalString;
  place_id: string | null;
  instructions: string | null;
};

export type BookingEmployeeSummary = {
  id: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
};

export type BookingAssignment = {
  id: string;
  employee_id: string;
  is_released: boolean;
  assigned_at: string;
  employee: BookingEmployeeSummary;
};

export type BookingItemRead = {
  id: string;
  item_name: string;
  quantity: number;
  description: string | null;
};

export type BookingMovingDetails = {
  property_type: PropertyType;
  floor: number | null;
  has_elevator: boolean | null;
  needs_carry_in: boolean;
  needs_carry_out: boolean;
  boxes_count: number | null;
  items_description: string | null;
};

export type BookingEvent = {
  id: string;
  previous_status: BookingStatus | null;
  new_status: BookingStatus;
  changed_by: BookingActor;
  note: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  booking_number: string;
  customer_id: string | null;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  service_type: ServiceType;
  start_datetime: string;
  end_datetime: string;
  status: BookingStatus;
  base_price: DecimalString;
  extras_price: DecimalString;
  total_price: DecimalString;
  distance_km: DecimalString | null;
  duration_minutes: number;
  customer_notes: string | null;
  vehicle: BookingVehicle | null;
  locations: BookingLocation[];
  assignments: BookingAssignment[];
  items: BookingItemRead[];
  moving_details: BookingMovingDetails | null;
  events: BookingEvent[];
  created_at: string;
  updated_at: string;
};

export type BookingCreated = Booking & { access_token: string };

export type HandoverDetails = {
  booking_id: string;
  access_code: string | null;
  pickup_instructions: string | null;
  return_instructions: string | null;
  code_generated_at: string | null;
  created_at: string;
  updated_at: string;
};
