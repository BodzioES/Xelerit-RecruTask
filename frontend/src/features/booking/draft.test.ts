import { describe, expect, it } from "vitest";
import { createInitialDraft, isSelfDrive } from "./draft";

describe("features/booking/draft", () => {
  it("creates an initial draft", () => {
    const draft = createInitialDraft("self_drive");
    expect(draft.serviceType).toBe("self_drive");
    expect(draft.pickup.address).toBe("");
    expect(draft.helpers).toBe(0);
  });

  it("checks self drive", () => {
    const sd = createInitialDraft("self_drive");
    const fm = createInitialDraft("full_moving");
    expect(isSelfDrive(sd)).toBe(true);
    expect(isSelfDrive(fm)).toBe(false);
  });
});
