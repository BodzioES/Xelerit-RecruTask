import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import Button, { buttonClassName } from "@/components/ui/Button";
import FieldShell from "@/components/ui/FieldShell";
import { controlClassName } from "@/components/ui/controlStyles";
import { locationKeys, reverseLocation, searchLocations, validateLocation } from "@/features/locations/api";
import MapPicker from "@/features/locations/components/MapPicker";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { errorMessage, isUnavailable } from "@/lib/errors";
import type { LocationSuggestion } from "@/types/api";

import type { DraftLocation } from "@/features/booking/types";

type PendingPoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: DraftLocation;
  onChange: (value: DraftLocation) => void;
};

export default function LocationPicker({ label, hint, error, required, value, onChange }: Props) {
  const inputId = useId();
  const [query, setQuery] = useState(value.address);
  const [showMap, setShowMap] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<PendingPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);

  const debounced = useDebouncedValue(query.trim(), 350);
  const searchEnabled = debounced.length >= 3 && debounced !== value.address.trim();
  const search = useQuery({
    queryKey: locationKeys.search(debounced),
    queryFn: () => searchLocations(debounced),
    enabled: searchEnabled,
    retry: false,
    staleTime: 60_000,
  });

  function handleAddressChange(address: string): void {
    setQuery(address);
    // Typing a new address invalidates both the picked point and the pending one:
    // the address text must always describe the point we send to the server.
    setPendingPoint(null);
    onChange({
      ...value,
      address,
      latitude: null,
      longitude: null,
      placeId: null,
      inServiceArea: null,
    });
  }

  function selectSuggestion(suggestion: LocationSuggestion): void {
    setPendingPoint(null);
    onChange({
      address: suggestion.address,
      latitude: Number(suggestion.latitude),
      longitude: Number(suggestion.longitude),
      placeId: suggestion.place_id,
      inServiceArea: suggestion.in_service_area,
    });
    setQuery(suggestion.address);
    setLookupNote(null);
  }

  function handleMapPick(latitude: number, longitude: number): void {
    // A click only marks a candidate point; the address is filled after confirmation.
    setPendingPoint({ latitude, longitude });
    setLookupNote(null);
  }

  async function confirmPendingPoint(): Promise<void> {
    if (!pendingPoint) return;
    const { latitude, longitude } = pendingPoint;
    setIsLocating(true);
    setLookupNote(null);
    try {
      const area = await validateLocation(latitude, longitude);
      const reversed = await reverseLocation(latitude, longitude);

      onChange({
        address: reversed.address,
        latitude,
        longitude,
        placeId: reversed.place_id,
        inServiceArea: area.in_service_area,
      });
      setQuery(reversed.address);
      setPendingPoint(null);
    } catch (confirmError) {
      // Without a resolved address the pin must stay pending: the address text and
      // the point sent to the server have to describe the same place.
      setLookupNote(
        `${errorMessage(confirmError)} Pick the address from the search list or try the point again.`,
      );
    } finally {
      setIsLocating(false);
    }
  }

  const hasPoint = value.latitude !== null && value.longitude !== null;
  const suggestions = search.data ?? [];
  const showSuggestions = searchEnabled && suggestions.length > 0;

  return (
    <FieldShell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(event) => handleAddressChange(event.target.value)}
            placeholder="Street, number, city"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={controlClassName(Boolean(error))}
          />
          <button
            type="button"
            onClick={() => setShowMap((current) => !current)}
            className={buttonClassName("secondary", "shrink-0 px-3 py-2 text-xs")}
            aria-expanded={showMap}
          >
            {showMap ? "Hide map" : "Map"}
          </button>
        </div>

        {showSuggestions ? (
          <ul
            aria-label={`${label} suggestions`}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            {suggestions.map((suggestion) => (
              <li key={`${suggestion.place_id ?? suggestion.address}`}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
                >
                  <span className="text-ink-900">{suggestion.address}</span>
                  <span
                    className={
                      suggestion.in_service_area ? "text-xs text-emerald-700" : "text-xs text-rose-700"
                    }
                  >
                    {suggestion.in_service_area
                      ? "Inside the service area"
                      : "Outside the service area"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {searchEnabled && search.isFetching ? (
          <p className="text-xs text-ink-500">Searching addresses…</p>
        ) : null}

        {isUnavailable(search.error) ? (
          <p className="text-xs text-ink-500">
            Address search is not configured. Pick the point on the map or try again later.
          </p>
        ) : search.error ? (
          <p className="text-xs text-rose-700">{errorMessage(search.error)}</p>
        ) : null}

        {showMap ? (
          <div className="space-y-2">
            <MapPicker
              latitude={value.latitude}
              longitude={value.longitude}
              pendingLatitude={pendingPoint?.latitude ?? null}
              pendingLongitude={pendingPoint?.longitude ?? null}
              onPick={handleMapPick}
            />
            <p className="text-xs text-ink-500">
              Click the map to place the pin, then confirm it to fill the address.
            </p>
            {pendingPoint ? (
              <div className="flex flex-col gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Point selected: {pendingPoint.latitude.toFixed(5)},{" "}
                  {pendingPoint.longitude.toFixed(5)}
                </span>
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => void confirmPendingPoint()}
                  disabled={isLocating}
                >
                  {isLocating ? "Filling the address…" : "Use this point"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <p aria-live="polite" className="flex flex-wrap items-center gap-1.5 text-xs">
          {isLocating ? (
            <span className="text-ink-500">Checking the location…</span>
          ) : hasPoint ? (
            <>
              <span className="text-ink-500">
                {value.latitude?.toFixed(5)}, {value.longitude?.toFixed(5)}
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span
                className={
                  value.inServiceArea === true
                    ? "font-medium text-emerald-700"
                    : value.inServiceArea === false
                      ? "font-medium text-rose-700"
                      : "text-ink-500"
                }
              >
                {value.inServiceArea === true
                  ? "Inside the service area"
                  : value.inServiceArea === false
                    ? "Outside the service area"
                    : "Point not verified yet"}
              </span>
            </>
          ) : (
            <span className="text-ink-500">
              Pick an address from the list or choose the point on the map.
            </span>
          )}
        </p>

        {lookupNote ? <p className="text-xs text-amber-800">{lookupNote}</p> : null}
      </div>
    </FieldShell>
  );
}
