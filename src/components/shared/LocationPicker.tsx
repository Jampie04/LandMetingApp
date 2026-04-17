"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

export interface PickedLocation {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation) => void;
}

// Suriname center
const DEFAULT_LAT = 5.8;
const DEFAULT_LNG = -55.2;
const DEFAULT_ZOOM = 8;

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const initTokenRef = useRef(0);
  // Keep a stable ref to onChange to avoid stale closure in Leaflet event handlers
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const initToken = ++initTokenRef.current;

    Promise.all([
      import("leaflet"),
      import("leaflet-control-geocoder"),
    ]).then(([L, GeocoderModule]) => {
      if (initToken !== initTokenRef.current) return;
      const currentContainer = containerRef.current;
      if (!currentContainer || mapRef.current) return;

      if ((currentContainer as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) {
        delete (currentContainer as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;
      }

      // Fix default icon paths broken by webpack
      // @ts-expect-error _getIconUrl missing from types
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(currentContainer).setView(
        [value?.lat ?? DEFAULT_LAT, value?.lng ?? DEFAULT_LNG],
        DEFAULT_ZOOM
      );
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Helper: place or move the draggable marker
      function placeMarker(lat: number, lng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const m = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current = m;
          m.on("dragend", () => {
            const pos = m.getLatLng();
            onChangeRef.current({ lat: round6(pos.lat), lng: round6(pos.lng) });
          });
        }
      }

      // Place initial marker if value already set
      if (value) {
        placeMarker(value.lat, value.lng);
      }

      // Click anywhere to drop / move pin
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        const loc = { lat: round6(e.latlng.lat), lng: round6(e.latlng.lng) };
        placeMarker(loc.lat, loc.lng);
        onChangeRef.current(loc);
      });

      // Geocoder search box (Nominatim — free, no API key)
      const geocoder = GeocoderModule.geocoder({
        defaultMarkGeocode: false, // we handle the marker ourselves
        placeholder: "Zoek adres…",
        errorMessage: "Adres niet gevonden",
        collapsed: false,
        // @ts-expect-error - countrycodes is valid for Nominatim but not in types
        countrycodes: "SR",
      });

      geocoder.on("markgeocode", (e: { geocode: { center: import("leaflet").LatLng } }) => {
        const { lat, lng } = e.geocode.center;
        const loc = { lat: round6(lat), lng: round6(lng) };
        placeMarker(loc.lat, loc.lng);
        map.setView([loc.lat, loc.lng], 16);
        onChangeRef.current(loc);
      });

      geocoder.addTo(map);
    });

    return () => {
      initTokenRef.current += 1;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      if (containerRef.current) {
        delete (containerRef.current as HTMLDivElement & { _leaflet_id?: number })._leaflet_id;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep marker in sync when value changes externally
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !value) return;
    markerRef.current.setLatLng([value.lat, value.lng]);
  }, [value]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-96 w-full rounded-xl border border-border overflow-hidden shadow-[0_2px_10px_rgba(31,29,26,0.06)]"
      />
      {value ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-medium">Geselecteerd:</span>
          <span className="font-mono">
            {value.lat}, {value.lng}
          </span>
          <a
            href={`https://www.google.com/maps?q=${value.lat},${value.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-primary underline underline-offset-2 hover:text-brand-dark"
          >
            Open in Maps ↗
          </a>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          Klik op de kaart om een locatie te pinnen
        </p>
      )}
    </div>
  );
}
