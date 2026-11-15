import { z } from "zod";

import type { ProviderVehicle } from "@/types/api";

import type { VehicleInput } from "./api";

function asNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const integerField = (minimum: number, maximum?: number) =>
  z.string().trim().refine(
    (value) => {
      const number = asNumber(value);
      if (number === null || !Number.isInteger(number) || number < minimum) return false;
      return maximum === undefined || number <= maximum;
    },
    `Enter a whole number of at least ${minimum}${maximum ? ` and at most ${maximum}` : ""}.`,
  );

const decimalField = (min: number, { above }: { above: boolean }) =>
  z.string().trim().refine(
    (value) => {
      const number = asNumber(value);
      if (number === null) return false;
      return above ? number > min : number >= min;
    },
    above
      ? `Enter a number greater than ${min}.`
      : `Enter a number greater than or equal to ${min}.`,
  );

/** Optional whole number: an empty string clears the value. */
const optionalIntegerField = (minimum: number, maximum: number) =>
  z.string().trim().refine(
    (value) => {
      if (value === "") return true;
      const number = asNumber(value);
      return number !== null && Number.isInteger(number) && number >= minimum && number <= maximum;
    },
    `Enter a whole number of at least ${minimum} and at most ${maximum}, or leave it empty.`,
  );

export const vehicleSchema = z.object({
  brand: z.string().trim().min(1, "Enter the brand.").max(80, "Use at most 80 characters."),
  model: z.string().trim().min(1, "Enter the model.").max(80, "Use at most 80 characters."),
  year: integerField(1990, 2100),
  category: z.string().trim().min(1, "Enter a category.").max(50, "Use at most 50 characters."),
  cargo_volume: decimalField(0, { above: true }),
  cargo_length_cm: optionalIntegerField(1, 2000),
  cargo_width_cm: optionalIntegerField(1, 2000),
  cargo_height_cm: optionalIntegerField(1, 2000),
  payload: integerField(1),
  seats: integerField(1),
  description: z.string().max(2000, "Use at most 2000 characters."),
  image_url: z
    .string()
    .max(500, "Use at most 500 characters.")
    .refine(
      (value) => value.trim() === "" || /^https?:\/\/|^\//.test(value.trim()),
      "Use a full URL or a path starting with /.",
    ),
  hourly_price: decimalField(0, { above: false }),
  daily_price: decimalField(0, { above: false }),
  is_active: z.boolean(),
});

export type VehicleValues = z.infer<typeof vehicleSchema>;

export function initialValues(vehicle: ProviderVehicle | null): VehicleValues {
  if (!vehicle) {
    return {
      brand: "",
      model: "",
      year: "2020",
      category: "Van",
      cargo_volume: "10",
      cargo_length_cm: "",
      cargo_width_cm: "",
      cargo_height_cm: "",
      payload: "1000",
      seats: "3",
      description: "",
      image_url: "",
      hourly_price: "0",
      daily_price: "0",
      is_active: true,
    };
  }
  return {
    brand: vehicle.brand,
    model: vehicle.model,
    year: String(vehicle.year),
    category: vehicle.category,
    cargo_volume: vehicle.cargo_volume,
    cargo_length_cm: vehicle.cargo_length_cm === null ? "" : String(vehicle.cargo_length_cm),
    cargo_width_cm: vehicle.cargo_width_cm === null ? "" : String(vehicle.cargo_width_cm),
    cargo_height_cm: vehicle.cargo_height_cm === null ? "" : String(vehicle.cargo_height_cm),
    payload: String(vehicle.payload),
    seats: String(vehicle.seats),
    description: vehicle.description ?? "",
    image_url: vehicle.image_url ?? "",
    hourly_price: vehicle.hourly_price,
    daily_price: vehicle.daily_price,
    is_active: vehicle.is_active,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toInput(values: VehicleValues): VehicleInput {
  return {
    brand: values.brand.trim(),
    model: values.model.trim(),
    year: Number(values.year),
    category: values.category.trim(),
    cargo_volume: String(round2(Number(values.cargo_volume))),
    cargo_length_cm: asNumber(values.cargo_length_cm),
    cargo_width_cm: asNumber(values.cargo_width_cm),
    cargo_height_cm: asNumber(values.cargo_height_cm),
    payload: Number(values.payload),
    seats: Number(values.seats),
    description: values.description.trim() || null,
    image_url: values.image_url.trim() || null,
    hourly_price: String(round2(Number(values.hourly_price))),
    daily_price: String(round2(Number(values.daily_price))),
    is_active: values.is_active,
  };
}
