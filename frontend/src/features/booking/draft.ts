import { addHours, combineLocal, defaultStart, toIsoFromLocal } from "@/lib/datetime";
import { MAX_HELPERS } from "@/lib/services";
import type { ServiceType } from "@/types/api";

import type {
  BookingDraft,
  CoordinatePoint,
  CreateBookingRequest,
  DraftLocation,
  QuoteRequest,
} from "./types";
import { FLOOR_PROPERTY_TYPES } from "./types";

export function emptyLocation(): DraftLocation {
  return { address: "", latitude: null, longitude: null, placeId: null, inServiceArea: null };
}

export function hasCoordinates(location: DraftLocation): boolean {
  return location.latitude !== null && location.longitude !== null;
}

function point(location: DraftLocation): CoordinatePoint | null {
  if (location.latitude === null || location.longitude === null) return null;
  return { latitude: location.latitude, longitude: location.longitude };
}

export function createInitialDraft(serviceType: ServiceType): BookingDraft {
  const start = defaultStart();
  const end = addHours(start.date, start.time, 4);

  return {
    serviceType,
    startDate: start.date,
    startTime: start.time,
    durationHours: 4,
    endDate: end.date,
    endTime: end.time,
    pickup: emptyLocation(),
    returnLocation: emptyLocation(),
    loading: emptyLocation(),
    unloading: emptyLocation(),
    vehicleId: null,
    vehicleLabel: null,
    helpers: 0,
    items: [],
    movingDetails: {
      propertyType: "apartment",
      floor: "",
      elevator: "",
      needsCarryIn: false,
      needsCarryOut: false,
      boxesCount: "",
      itemsDescription: "",
    },
    additionalService: false,
    customer: { firstName: "", lastName: "", email: "", phone: "", notes: "" },
  };
}

export function isSelfDrive(draft: BookingDraft): boolean {
  return draft.serviceType === "self_drive";
}

export function draftStartIso(draft: BookingDraft): string | null {
  const value = combineLocal(draft.startDate, draft.startTime);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export function draftEndIso(draft: BookingDraft): string | null {
  if (isSelfDrive(draft)) {
    const value = combineLocal(draft.endDate, draft.endTime);
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const start = combineLocal(draft.startDate, draft.startTime);
  if (Number.isNaN(start.getTime())) return null;
  const end = addHours(draft.startDate, draft.startTime, draft.durationHours);
  const endIso = toIsoFromLocal(end.date, end.time);
  return endIso || null;
}

export function draftOrigin(draft: BookingDraft): CoordinatePoint | null {
  return point(isSelfDrive(draft) ? draft.pickup : draft.loading);
}

export function draftDestination(draft: BookingDraft): CoordinatePoint | null {
  return point(isSelfDrive(draft) ? draft.returnLocation : draft.unloading);
}

export function draftLocations(draft: BookingDraft): DraftLocation[] {
  return isSelfDrive(draft)
    ? [draft.pickup, draft.returnLocation]
    : [draft.loading, draft.unloading];
}

export function quoteRequestFromDraft(
  draft: BookingDraft,
  startIso: string,
  endIso: string,
): QuoteRequest {
  const moving = draft.serviceType === "full_moving";
  const showFloor = moving && FLOOR_PROPERTY_TYPES.has(draft.movingDetails.propertyType);
  const floor = showFloor && draft.movingDetails.floor !== "" ? Number(draft.movingDetails.floor) : null;
  const hasElevator =
    showFloor && floor !== null && floor > 0 ? draft.movingDetails.elevator === "yes" : null;

  return {
    service_type: draft.serviceType,
    start_datetime: startIso,
    end_datetime: endIso,
    vehicle_id: draft.vehicleId,
    helpers: moving ? draft.helpers : 0,
    floor: moving ? floor : null,
    has_elevator: moving ? hasElevator : null,
    additional_service: draft.additionalService,
    origin: draftOrigin(draft),
    destination: draftDestination(draft),
  };
}

function toLocationRequest(
  location: DraftLocation,
  locationType: CreateBookingRequest["locations"][number]["location_type"],
): CreateBookingRequest["locations"][number] {
  if (location.latitude === null || location.longitude === null) {
    throw new Error(`The ${locationType} location has no coordinates`);
  }
  return {
    location_type: locationType,
    address: location.address.trim(),
    latitude: location.latitude,
    longitude: location.longitude,
    place_id: location.placeId,
  };
}

export function buildCreateRequest(
  draft: BookingDraft,
  startIso: string,
  endIso: string,
): CreateBookingRequest {
  const moving = draft.serviceType === "full_moving";
  const rawLocations = isSelfDrive(draft)
    ? [
        toLocationRequest(draft.pickup, "pickup"),
        toLocationRequest(draft.returnLocation, "return"),
      ]
    : [
        toLocationRequest(draft.loading, "loading"),
        toLocationRequest(draft.unloading, "unloading"),
      ];

  const items =
    draft.serviceType === "self_drive"
      ? []
      : draft.items
          .filter((item) => item.itemName.trim().length > 0)
          .map((item) => ({
            item_name: item.itemName.trim(),
            quantity: Number(item.quantity) || 1,
            description: item.description.trim() || null,
          }));

  const showFloor = moving && FLOOR_PROPERTY_TYPES.has(draft.movingDetails.propertyType);
  const floor = showFloor && draft.movingDetails.floor !== "" ? Number(draft.movingDetails.floor) : null;
  const boxes = draft.movingDetails.boxesCount === "" ? null : Number(draft.movingDetails.boxesCount);

  return {
    customer_first_name: draft.customer.firstName.trim(),
    customer_last_name: draft.customer.lastName.trim(),
    customer_email: draft.customer.email.trim(),
    customer_phone: draft.customer.phone.trim(),
    service_type: draft.serviceType,
    start_datetime: startIso,
    end_datetime: endIso,
    vehicle_id: draft.vehicleId,
    helpers: moving ? Math.min(draft.helpers, MAX_HELPERS) : 0,
    additional_service: draft.additionalService,
    customer_notes: draft.customer.notes.trim() || null,
    locations: rawLocations,
    items,
    moving_details: moving
      ? {
          property_type: draft.movingDetails.propertyType,
          floor,
          has_elevator: showFloor && floor !== null && floor > 0 ? draft.movingDetails.elevator === "yes" : null,
          needs_carry_in: draft.movingDetails.needsCarryIn,
          needs_carry_out: draft.movingDetails.needsCarryOut,
          boxes_count: boxes,
          items_description: draft.movingDetails.itemsDescription.trim() || null,
        }
      : null,
  };
}
