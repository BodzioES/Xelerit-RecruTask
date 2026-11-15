import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import TextArea from "@/components/ui/TextArea";
import TextInput from "@/components/ui/TextInput";
import { ApiError } from "@/services/apiClient";
import { errorMessage } from "@/lib/errors";
import type { ProviderVehicle } from "@/types/api";

import { createProviderVehicle, updateProviderVehicle, type VehicleInput } from "../api";

const IMAGE_PICKS = [
  { label: "Mini van", value: "/mini-van.webp" },
  { label: "Semi van", value: "/semi-van.webp" },
  { label: "Big van", value: "/big-van.webp" },
  { label: "Mega van", value: "/mega-van.webp" },
] as const;

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

const vehicleSchema = z.object({
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

type VehicleValues = z.infer<typeof vehicleSchema>;

function initialValues(vehicle: ProviderVehicle | null): VehicleValues {
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

function toInput(values: VehicleValues): VehicleInput {
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

type Props = {
  vehicle: ProviderVehicle | null;
  onSaved: () => void;
  onCancel: () => void;
};

export default function VehicleForm({ vehicle, onSaved, onCancel }: Props) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VehicleValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: initialValues(vehicle),
  });

  const mutation = useMutation({
    mutationFn: (values: VehicleValues) => {
      const input = toInput(values);
      return vehicle
        ? updateProviderVehicle(vehicle.id, input)
        : createProviderVehicle(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["provider"] });
      reset(initialValues(vehicle));
      onSaved();
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return;
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        if (field in vehicleSchema.shape) {
          setError(field as keyof VehicleValues, { message });
        }
      }
    },
  });

  const imageUrl = watch("image_url");

  return (
    <Panel
      title={vehicle ? "Edit vehicle" : "New vehicle"}
      description="Prices are stored as decimals. The API validates every field again."
      actions={
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      }
    >
      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput
            label="Brand"
            required
            error={errors.brand?.message}
            {...register("brand")}
          />
          <TextInput
            label="Model"
            required
            error={errors.model?.message}
            {...register("model")}
          />
          <TextInput
            label="Year"
            inputMode="numeric"
            required
            error={errors.year?.message}
            {...register("year")}
          />
          <TextInput
            label="Category"
            required
            hint="For example: Van, Box van, Refrigerated."
            error={errors.category?.message}
            {...register("category")}
          />
          <TextInput
            label="Cargo volume (m³)"
            inputMode="decimal"
            required
            error={errors.cargo_volume?.message}
            {...register("cargo_volume")}
          />
          <TextInput
            label="Cargo length (cm)"
            inputMode="numeric"
            hint="Interior length. Leave empty if unknown."
            error={errors.cargo_length_cm?.message}
            {...register("cargo_length_cm")}
          />
          <TextInput
            label="Cargo width (cm)"
            inputMode="numeric"
            hint="Interior width. Leave empty if unknown."
            error={errors.cargo_width_cm?.message}
            {...register("cargo_width_cm")}
          />
          <TextInput
            label="Cargo height (cm)"
            inputMode="numeric"
            hint="Interior height. Leave empty if unknown."
            error={errors.cargo_height_cm?.message}
            {...register("cargo_height_cm")}
          />
          <TextInput
            label="Payload (kg)"
            inputMode="numeric"
            required
            error={errors.payload?.message}
            {...register("payload")}
          />
          <TextInput
            label="Seats"
            inputMode="numeric"
            required
            error={errors.seats?.message}
            {...register("seats")}
          />
          <TextInput
            label="Hourly price (PLN)"
            inputMode="decimal"
            required
            error={errors.hourly_price?.message}
            {...register("hourly_price")}
          />
          <TextInput
            label="Daily price (PLN)"
            inputMode="decimal"
            required
            error={errors.daily_price?.message}
            {...register("daily_price")}
          />
        </div>

        <TextArea
          label="Description"
          maxLength={2000}
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="rounded-xl border border-slate-200 p-4">
          <TextInput
            label="Image URL"
            hint="Use a link or one of the demo illustrations below."
            error={errors.image_url?.message}
            {...register("image_url")}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {IMAGE_PICKS.map((pick) => (
              <button
                key={pick.value}
                type="button"
                onClick={() => setValue("image_url", pick.value, { shouldValidate: true })}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
              >
                {pick.label}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {imageUrl.trim() ? (
              <img
                src={imageUrl}
                alt="Vehicle preview"
                className="h-32 w-full max-w-xs rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div className="grid h-32 w-full max-w-xs place-items-center rounded-lg bg-slate-100 text-xs text-ink-500">
                No image selected
              </div>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300 text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            {...register("is_active")}
          />
          Active and available for bookings
        </label>

        {mutation.isError ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" isLoading={mutation.isPending}>
            {vehicle ? "Save changes" : "Create vehicle"}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}
