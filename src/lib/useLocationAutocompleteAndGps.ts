import { useState, useEffect, useRef, useCallback } from 'react';

type BigDataReverse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
};

export const LOCATION_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

/**
 * Loads Google Places on the given input and handles GPS + reverse geocode.
 * Parent owns text + coords; call onResolved when GPS or Places succeeds.
 */
export function useLocationAutocompleteAndGps(options: {
  active: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onResolved: (label: string, lat: number, lng: number) => void;
}) {
  const { active, inputRef, onResolved } = options;
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!(window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places,
  );
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const mapsKey = LOCATION_MAPS_KEY;

  useEffect(() => {
    if (!active || !mapsKey?.trim()) return;
    const w = window as unknown as { google?: { maps?: { places?: unknown } } };
    if (w.google?.maps?.places) {
      setMapsReady(true);
      return;
    }
    const existing = document.getElementById('duel-google-maps-js');
    if (existing) {
      const onLoad = () => setMapsReady(true);
      existing.addEventListener('load', onLoad);
      return () => existing.removeEventListener('load', onLoad);
    }
    const s = document.createElement('script');
    s.id = 'duel-google-maps-js';
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey.trim())}&libraries=places`;
    s.onload = () => setMapsReady(true);
    s.onerror = () => setMapLoadError('Could not load location search. Try GPS or check the API key.');
    document.head.appendChild(s);
  }, [active, mapsKey]);

  useEffect(() => {
    if (!active || !mapsReady || !mapsKey?.trim()) return;
    let cancelled = false;
    let listener: { remove: () => void } | null = null;
    const bind = () => {
      if (cancelled) return;
      const input = inputRef.current;
      if (!input || autocompleteRef.current) return;
      const w = window as unknown as { google: typeof google };
      if (!w.google?.maps?.places) return;

      const ac = new w.google.maps.places.Autocomplete(input, {
        types: ['(cities)'],
        fields: ['formatted_address', 'geometry', 'name'],
      });
      autocompleteRef.current = ac;
      listener = ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        if (!loc) return;
        const lat = loc.lat();
        const lng = loc.lng();
        const addr = place.formatted_address ?? place.name ?? '';
        onResolved(addr, lat, lng);
      });
    };
    bind();
    const t = window.setTimeout(bind, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      if (listener) listener.remove();
      autocompleteRef.current = null;
    };
  }, [active, mapsReady, mapsKey, inputRef, onResolved]);

  useEffect(() => {
    if (!active) {
      setMapLoadError(null);
    }
  }, [active]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapLoadError('Geolocation is not supported in this browser.');
      return;
    }
    setGeoLoading(true);
    setMapLoadError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lng))}&localityLanguage=en`,
          );
          if (!res.ok) throw new Error('reverse geocode');
          const j = (await res.json()) as BigDataReverse;
          const label = j.city || j.locality || j.principalSubdivision || 'Unknown location';
          onResolved(label, lat, lng);
        } catch {
          onResolved('Unknown location', lat, lng);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setMapLoadError(err.message || 'Could not get your location.');
      },
      { enableHighAccuracy: true, timeout: 25_000, maximumAge: 0 },
    );
  }, [onResolved]);

  return {
    geoLoading,
    mapLoadError,
    setMapLoadError,
    mapsReady,
    mapsKey,
    requestCurrentLocation,
  };
}
