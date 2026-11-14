import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

/** Sopot pier — the centre of the service area used by the backend. */
export const SERVICE_AREA_CENTER: [number, number] = [54.4416, 18.5601];

type PickHandlerProps = {
  onPick: (latitude: number, longitude: number) => void;
};

function PickHandler({ onPick }: PickHandlerProps) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

type RecenterProps = {
  latitude: number | null;
  longitude: number | null;
};

function Recenter({ latitude, longitude }: RecenterProps) {
  const map = useMap();

  useEffect(() => {
    if (latitude === null || longitude === null) return;
    map.setView([latitude, longitude], Math.max(map.getZoom(), 13));
  }, [map, latitude, longitude]);

  return null;
}

type Props = {
  latitude: number | null;
  longitude: number | null;
  onPick: (latitude: number, longitude: number) => void;
};

export default function MapPicker({ latitude, longitude, onPick }: Props) {
  const hasPoint = latitude !== null && longitude !== null;
  const center: [number, number] = hasPoint ? [latitude, longitude] : SERVICE_AREA_CENTER;

  return (
    <div className="h-80 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
        aria-label="Map for choosing a location"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PickHandler onPick={onPick} />
        {hasPoint ? (
          <CircleMarker
            center={[latitude, longitude]}
            radius={9}
            pathOptions={{ color: "#1c44b8", fillColor: "#2554e0", fillOpacity: 0.9 }}
          />
        ) : null}
        <Recenter latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
}
