import { describe, expect, it } from "vitest";

import { createInitialDraft } from "@/features/booking/draft";

import type { MovePlan } from "./api";
import { draftPatchFromPlan } from "./applyPlan";

const plan: MovePlan = {
  suggested_service: "full_moving",
  property_type: "apartment",
  floor: 3,
  has_elevator: false,
  boxes_count: 20,
  helpers: 9,
  items: [
    { name: "Sofa", quantity: 1 },
    { name: "Fridge", quantity: 1 },
  ],
  summary: "Full Moving with 2 movers.",
};

describe("features/assistant/applyPlan", () => {
  it("fills moving details and caps the helpers for Full Moving", () => {
    const patch = draftPatchFromPlan(createInitialDraft("full_moving"), plan);

    expect(patch.movingDetails?.floor).toBe("3");
    expect(patch.movingDetails?.elevator).toBe("no");
    expect(patch.movingDetails?.boxesCount).toBe("20");
    expect(patch.helpers).toBe(4);
    expect(patch.items?.map((item) => item.itemName)).toEqual(["Sofa", "Fridge"]);
  });

  it("only adds items for Van + Driver", () => {
    const patch = draftPatchFromPlan(createInitialDraft("van_driver"), plan);

    expect(patch.movingDetails).toBeUndefined();
    expect(patch.helpers).toBeUndefined();
    expect(patch.items).toHaveLength(2);
  });

  it("keeps items the customer already listed", () => {
    const draft = createInitialDraft("van_driver");
    draft.items = [{ key: "own", itemName: "sofa", quantity: "2", description: "Grey" }];

    const items = draftPatchFromPlan(draft, plan).items ?? [];

    expect(items.map((item) => item.itemName)).toEqual(["sofa", "Fridge"]);
    expect(items[0].quantity).toBe("2");
  });

  it("keeps a typed floor when the assistant does not know it", () => {
    const draft = createInitialDraft("full_moving");
    draft.movingDetails.floor = "5";

    const patch = draftPatchFromPlan(draft, { ...plan, floor: null, has_elevator: null });

    expect(patch.movingDetails?.floor).toBe("5");
  });
});
