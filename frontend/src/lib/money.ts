const moneyFormatter = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
});

/** Format a server-provided decimal string as PLN. Never used for price math. */
export function formatMoney(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return moneyFormatter.format(amount);
}

/** Trim trailing zeros from decimal quantities such as "4.00". */
export function formatQuantity(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(amount);
}
