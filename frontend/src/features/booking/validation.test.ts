import { describe, expect, it } from "vitest";

import { createInitialDraft } from "./draft";
import type { BookingDraft, DraftLocation } from "./types";
import { firstErrorMessage, hasErrors, validateDetails, validateSchedule } from "./validation";

function location(overrides: Partial<DraftLocation> = {}): DraftLocation {
  return {
    address: "ul. Testowa 1",
    latitude: 54.4,
    longitude: 18.6,
    placeId: null,
    inServiceArea: true,
    ...overrides,
  };
}

function validSelfDriveDraft(): BookingDraft {
  const draft = createInitialDraft("self_drive");
  draft.startDate = "2027-03-10";
  draft.startTime = "10:00";
  draft.endDate = "2027-03-10";
  draft.endTime = "14:00";
  draft.pickup = location();
  draft.returnLocation = location({ address: "ul. Inna 2" });
  return draft;
}

function validMovingDraft(): BookingDraft {
  const draft = createInitialDraft("full_moving");
  draft.startDate = "2027-03-10";
  draft.startTime = "10:00";
  draft.durationHours = 4;
  draft.loading = location();
  draft.unloading = location({ address: "ul. Inna 2" });
  draft.movingDetails.floor = "0";
  draft.movingDetails.elevator = "";
  return draft;
}

describe("validateSchedule", () => {
  it("accepts a consistent self-drive draft", () => {
    expect(validateSchedule(validSelfDriveDraft(), new Date("2027-01-01T00:00:00Z"))).toEqual({});
  });

  it("rejects a start time in the past", () => {
    const draft = validMovingDraft();
    const errors = validateSchedule(draft, new Date("2027-03-11T00:00:00Z"));
    expect(errors.start).toBe("Choose a start time in the future.");
  });

  it("requires a return after pickup for self-drive", () => {
    const draft = validSelfDriveDraft();
    draft.endTime = "09:00";
    expect(validateSchedule(draft, new Date("2027-01-01T00:00:00Z")).end).toBe(
      "The return time must be after the pickup time.",
    );
  });

  it("requires a positive duration for moving services", () => {
    const draft = validMovingDraft();
    draft.durationHours = 0;
    expect(validateSchedule(draft, new Date("2027-01-01T00:00:00Z")).end).toBe(
      "The service duration must be longer than zero.",
    );
  });

  it.each([
    [{ address: "" }, "Enter the pickup address."],
    [{ latitude: null, longitude: null }, "Choose the pickup point from the address list or on the map."],
    [{ inServiceArea: false }, "The pickup location is outside our service area (Tri-City area + 30 km)."],
    [{ inServiceArea: null }, "We could not verify the pickup location. Pick the point on the map again."],
  ])("reports pickup location problems (%j)", (overrides, message) => {
    const draft = validSelfDriveDraft();
    draft.pickup = location(overrides);
    expect(validateSchedule(draft, new Date("2027-01-01T00:00:00Z")).pickup).toBe(message);
  });

  it("validates loading and unloading locations for moving services", () => {
    const draft = validMovingDraft();
    draft.loading = location({ address: "" });
    draft.unloading = location({ inServiceArea: false });
    const errors = validateSchedule(draft, new Date("2027-01-01T00:00:00Z"));
    expect(errors.loading).toBe("Enter the loading address.");
    expect(errors.unloading).toContain("outside our service area");
  });
});

describe("validateDetails", () => {
  it("skips non-moving services", () => {
    const draft = validMovingDraft();
    draft.serviceType = "van_driver";
    draft.movingDetails.floor = "-1";
    expect(validateDetails(draft)).toEqual({});
  });

  it("requires the elevator answer for a floor above ground level", () => {
    const draft = validMovingDraft();
    draft.movingDetails.floor = "3";
    draft.movingDetails.elevator = "";
    expect(validateDetails(draft).elevator).toBe("Tell us whether the building has an elevator.");
  });

  it.each(["apartment", "office", "retail"] as const)(
    "requires a floor for a %s",
    (propertyType) => {
      const draft = validMovingDraft();
      draft.movingDetails.propertyType = propertyType;
      draft.movingDetails.floor = "";
      expect(validateDetails(draft).floor).toBe("Enter the floor (0 for the ground floor).");
    },
  );

  it("does not require a floor for a house", () => {
    const draft = validMovingDraft();
    draft.movingDetails.propertyType = "house";
    draft.movingDetails.floor = "";
    expect(validateDetails(draft)).toEqual({});
  });

  it("accepts ground floor without an elevator answer", () => {
    const draft = validMovingDraft();
    draft.movingDetails.floor = "0";
    draft.movingDetails.elevator = "";
    expect(validateDetails(draft)).toEqual({});
  });

  it("rejects floors outside the 0–200 range", () => {
    for (const floor of ["-1", "201"]) {
      const draft = validMovingDraft();
      draft.movingDetails.floor = floor;
      expect(validateDetails(draft).floor).toBe("Enter a floor between 0 and 200.");
    }
  });

  it("rejects non-integer or negative box counts", () => {
    for (const boxes of ["abc", "-1", "2.5"]) {
      const draft = validMovingDraft();
      draft.movingDetails.boxesCount = boxes;
      expect(validateDetails(draft).boxes).toBe("Enter a whole number of boxes (0–10000).");
    }
  });

  it("requires a name for every item row", () => {
    const draft = validMovingDraft();
    draft.items = [{ key: "a", itemName: "Sofa", quantity: "1", description: "" }];
    expect(validateDetails(draft)).toEqual({});
    draft.items.push({ key: "b", itemName: "  ", quantity: "2", description: "" });
    expect(validateDetails(draft).items).toBe("Enter an item name or remove the empty row.");
  });

  it("exposes error helpers", () => {
    const errors = { a: "First", b: "Second" };
    expect(hasErrors(errors)).toBe(true);
    expect(hasErrors({})).toBe(false);
    expect(firstErrorMessage(errors)).toBe("First");
    expect(firstErrorMessage({})).toBeNull();
  });
});
