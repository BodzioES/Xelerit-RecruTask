import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { buttonClassName } from "@/components/ui/Button";
import FieldShell from "@/components/ui/FieldShell";
import { controlClassName } from "@/components/ui/controlStyles";
import { locationKeys, reverseLocation, searchLocations, validateLocation } from "@/features/locations/api";
import MapPicker from "@/features/locations/components/MapPicker";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { errorMessage, isUnavailable } from "@/lib/errors";
import type { LocationSuggestion } from "@/types/api";

import type { DraftLocation } from "@/features/booking/types";

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
    onChange({ ...value, address, placeId: null });
  }

  function selectSuggestion(suggestion: LocationSuggestion): void {
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

  async function handleMapPick(latitude: number, longitude: number): Promise<void> {
    setIsLocating(true);
    setLookupNote(null);
    try {
      const area = await validateLocation(latitude, longitude);
      let address = value.address.trim();
      let placeId = value.placeId;

      if (!address) {
        try {
          const reversed = await reverseLocation(latitude, longitude);
          address = reversed.address;
          placeId = reversed.place_id;
          setQuery(address);
        } catch (reverseError) {
          if (isUnavailable(reverseError)) {
            setLookupNote(
              "Address lookup is not configured here. Type the address above; the map point is saved.",
            );
          }
        }
      }

      onChange({
        address,
        latitude,
        longitude,
        placeId,
        inServiceArea: area.in_service_area,
      });
    } catch (validateError) {
      setLookupNote(errorMessage(validateError));
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
            Address search is not configured. Type the address and pick the exact point on the map.
          </p>
        ) : search.error ? (
          <p className="text-xs text-rose-700">{errorMessage(search.error)}</p>
        ) : null}

        {showMap ? (
          <div className="space-y-2">
            <MapPicker
              latitude={value.latitude}
              longitude={value.longitude}
              onPick={(latitude, longitude) => {
                void handleMapPick(latitude, longitude);
              }}
            />
            <p className="text-xs text-ink-500">
              Click the map to place the pin. We check every point against the service area.
            </p>
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
