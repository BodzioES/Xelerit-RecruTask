import { FLOOR_PROPERTY_TYPES, type BookingDraft, type DraftItem } from "@/features/booking/types";
import { MAX_HELPERS } from "@/lib/services";

import type { MovePlan } from "./api";

function newItemKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Keep what the customer already typed and add only the items they have not listed yet. */
function mergeItems(current: DraftItem[], plan: MovePlan): DraftItem[] {
  const kept = current.filter((item) => item.itemName.trim());
  const known = new Set(kept.map((item) => item.itemName.trim().toLowerCase()));
  const added = plan.items
    .filter((item) => !known.has(item.name.toLowerCase()))
    .map((item) => ({
      key: newItemKey(),
      itemName: item.name,
      quantity: String(item.quantity),
      description: "",
    }));
  return [...kept, ...added];
}

/**
 * Turn the assistant's suggestion into a draft patch. Only fields the assistant is sure about
 * are filled; the customer still reviews every value before the server prices the booking.
 */
export function draftPatchFromPlan(draft: BookingDraft, plan: MovePlan): Partial<BookingDraft> {
  const patch: Partial<BookingDraft> = { items: mergeItems(draft.items, plan) };
  if (draft.serviceType !== "full_moving") return patch;

  const details = { ...draft.movingDetails };
  if (plan.property_type) {
    details.propertyType = plan.property_type;
    // Houses, warehouses and halls have no floor field, so clear what no longer applies.
    if (!FLOOR_PROPERTY_TYPES.has(plan.property_type)) {
      details.floor = "";
      details.elevator = "";
    }
  }
  if (plan.floor !== null) details.floor = String(plan.floor);
  if (plan.has_elevator !== null) details.elevator = plan.has_elevator ? "yes" : "no";
  if (plan.boxes_count !== null) details.boxesCount = String(plan.boxes_count);
  patch.movingDetails = details;

  if (plan.helpers !== null) patch.helpers = Math.min(plan.helpers, MAX_HELPERS);
  return patch;
}
