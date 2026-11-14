import type { ServiceType } from "@/types/api";

export type ServiceSlug = "self-drive" | "van-driver" | "full-moving";

export type ServiceMeta = {
  slug: ServiceSlug;
  serviceType: ServiceType;
  name: string;
  summary: string;
  points: readonly string[];
  /** One sentence about how the price is built, shown on the site and in the wizard. */
  pricing: string;
  requiresVehicle: boolean;
  isMoving: boolean;
};

export const SERVICES: readonly ServiceMeta[] = [
  {
    slug: "self-drive",
    serviceType: "self_drive",
    name: "Self Drive",
    summary: "Take the van and drive it yourself. Pick up the keys from a lockbox in the vehicle.",
    points: ["Hourly or daily rental", "Pickup and return locations", "No account required"],
    pricing:
      "Billed by the hour for short rentals and per 24 hours for longer ones. The price for your dates is shown before you confirm.",
    requiresVehicle: true,
    isMoving: false,
  },
  {
    slug: "van-driver",
    serviceType: "van_driver",
    name: "Van + Driver",
    summary: "Transport for furniture, appliances, boxes or a single large item.",
    points: ["Loading and unloading", "Experienced driver", "Clear distance-based quote"],
    pricing:
      "A base fee, the service hours and the route kilometres. The distance follows the real route, not a straight line.",
    requiresVehicle: false,
    isMoving: true,
  },
  {
    slug: "full-moving",
    serviceType: "full_moving",
    name: "Full Moving",
    summary: "A van, a driver and a crew of movers for apartments, houses and offices.",
    points: ["Choose the number of helpers", "Floors and elevator handled", "One price breakdown"],
    pricing:
      "A base fee, service hours, distance, the movers you choose, plus floor and no-elevator surcharges.",
    requiresVehicle: false,
    isMoving: true,
  },
];

/** Mirrors MAX_MOVING_HELPERS from the backend configuration. */
export const MAX_HELPERS = 4;

export function serviceBySlug(slug: string | undefined): ServiceMeta | undefined {
  return SERVICES.find((service) => service.slug === slug);
}

export function serviceByType(serviceType: ServiceType): ServiceMeta {
  const service = SERVICES.find((item) => item.serviceType === serviceType);
  if (!service) {
    throw new Error(`Unknown service type: ${serviceType}`);
  }
  return service;
}
