import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import { controlClassName } from "@/components/ui/controlStyles";

import type { DraftItem } from "../types";

type Props = {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  error?: string;
};

function createItem(): DraftItem {
  return {
    key:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    itemName: "",
    quantity: "1",
    description: "",
  };
}

export default function ItemListEditor({ items, onChange, error }: Props) {
  function updateItem(key: string, patch: Partial<DraftItem>): void {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-700">What will you move?</p>
          <p className="text-xs text-ink-500">Add the largest items so we can plan the space.</p>
        </div>
        <Button variant="secondary" onClick={() => onChange([...items, createItem()])}>
          Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-ink-500">
          No items added yet. You can describe everything in the notes instead.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.key} className="grid gap-2 sm:grid-cols-[1fr_5rem_auto]">
              <div>
                <label htmlFor={`item-name-${item.key}`} className="sr-only">
                  Item {index + 1} name
                </label>
                <input
                  id={`item-name-${item.key}`}
                  value={item.itemName}
                  onChange={(event) => updateItem(item.key, { itemName: event.target.value })}
                  placeholder="Sofa, washing machine…"
                  className={controlClassName(false)}
                />
              </div>
              <div>
                <label htmlFor={`item-quantity-${item.key}`} className="sr-only">
                  Item {index + 1} quantity
                </label>
                <input
                  id={`item-quantity-${item.key}`}
                  type="number"
                  min={1}
                  max={999}
                  value={item.quantity}
                  onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                  className={controlClassName(false)}
                />
              </div>
              <Button
                variant="ghost"
                onClick={() => onChange(items.filter((entry) => entry.key !== item.key))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
