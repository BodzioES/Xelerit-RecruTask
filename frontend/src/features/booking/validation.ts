import { combineLocal } from "@/lib/datetime";

import { draftEndIso, isSelfDrive } from "./draft";
import type { BookingDraft, DraftLocation } from "./types";
import { FLOOR_PROPERTY_TYPES } from "./types";

export type StepErrors = Record<string, string>;

function locationError(location: DraftLocation, label: string): string | undefined {
  if (!location.address.trim()) return `Enter the ${label} address.`;
  if (location.latitude === null || location.longitude === null) {
    return `Choose the ${label} point from the address list or on the map.`;
  }
  if (location.inServiceArea === false) {
    return `The ${label} location is outside our service area (Tri-City area + 30 km).`;
  }
  if (location.inServiceArea === null) {
    return `We could not verify the ${label} location. Pick the point on the map again.`;
  }
  return undefined;
}

export function validateSchedule(draft: BookingDraft, now = new Date()): StepErrors {
  const errors: StepErrors = {};
  const start = combineLocal(draft.startDate, draft.startTime);

  if (Number.isNaN(start.getTime())) {
    errors.start = "Choose the start date and time.";
  } else if (start.getTime() <= now.getTime()) {
    errors.start = "Choose a start time in the future.";
  }

  if (!errors.start) {
    const endIso = draftEndIso(draft);
    const end = endIso ? new Date(endIso) : null;
    if (!end || Number.isNaN(end.getTime())) {
      errors.end = "Choose the end date and time.";
    } else if (end.getTime() <= start.getTime()) {
      errors.end = isSelfDrive(draft)
        ? "The return time must be after the pickup time."
        : "The service duration must be longer than zero.";
    }
  }

  if (isSelfDrive(draft)) {
    const pickup = locationError(draft.pickup, "pickup");
    if (pickup) errors.pickup = pickup;
    const dropOff = locationError(draft.returnLocation, "return");
    if (dropOff) errors.return = dropOff;
  } else {
    const loading = locationError(draft.loading, "loading");
    if (loading) errors.loading = loading;
    const unloading = locationError(draft.unloading, "unloading");
    if (unloading) errors.unloading = unloading;
  }

  return errors;
}

export function validateDetails(draft: BookingDraft): StepErrors {
  if (draft.serviceType !== "full_moving") return {};

  const errors: StepErrors = {};
  const { movingDetails } = draft;
  const showFloor = FLOOR_PROPERTY_TYPES.has(movingDetails.propertyType);

  if (showFloor) {
    if (movingDetails.floor === "") {
      errors.floor = "Enter the floor (0 for the ground floor).";
    } else {
      const floor = Number(movingDetails.floor);
      if (!Number.isInteger(floor) || floor < 0 || floor > 200) {
        errors.floor = "Enter a floor between 0 and 200.";
      } else if (floor > 0 && !movingDetails.elevator) {
        errors.elevator = "Tell us whether the building has an elevator.";
      }
    }
  }

  if (movingDetails.boxesCount !== "") {
    const boxes = Number(movingDetails.boxesCount);
    if (!Number.isInteger(boxes) || boxes < 0 || boxes > 10000) {
      errors.boxes = "Enter a whole number of boxes (0–10000).";
    }
  }

  if (draft.items.some((item) => item.itemName.trim().length === 0)) {
    errors.items = "Enter an item name or remove the empty row.";
  }

  return errors;
}

export function hasErrors(errors: StepErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function firstErrorMessage(errors: StepErrors): string | null {
  const [first] = Object.values(errors);
  return first ?? null;
}
