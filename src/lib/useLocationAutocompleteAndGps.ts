import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

type BigDataReverse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
};

export const LOCATION_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

export type PlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

type PlacesLibrary = {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (req: {
      input: string;
      includedPrimaryTypes?: string[];
      sessionToken?: unknown;
    }) => Promise<{
      suggestions: Array<{
        placePrediction?: {
          placeId: string;
          mainText: { text: string };
          secondaryText: { text: string };
          toPlace: () => { fetchFields: (opts: { fields: string[] }) => Promise<{ place: PlaceResult }> };
        };
      }>;
    }>;
  };
  AutocompleteSessionToken: new () => unknown;
};

type PlaceResult = {
  location?: { lat: () => number; lng: () => number } | null;
  formattedAddress?: string;
  displayName?: string;
};

let placesLib: PlacesLibrary | null = null;
let placesLibPromise: Promise<PlacesLibrary> | null = null;

async function getPlacesLib(): Promise<PlacesLibrary> {
  if (placesLib) return placesLib;
  if (placesLibPromise) return placesLibPromise;
  placesLibPromise = (
    google.maps.importLibrary('places') as Promise<PlacesLibrary>
  ).then((lib) => {
    placesLib = lib;
    return lib;
  });
  return placesLibPromise;
}

export function useLocationAutocompleteAndGps(options: {
  active: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onResolved: (label: string, lat: number, lng: number) => void;
}) {
  const { active, onResolved } = options;
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const sessionTokenRef = useRef<unknown>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapsKey = LOCATION_MAPS_KEY;

  // Load the core Maps JS bootstrap (once)
  useEffect(() => {
    if (!active || !mapsKey?.trim()) return;
    const w = window as unknown as { google?: { maps?: { importLibrary?: unknown } } };
    if (w.google?.maps?.importLibrary) {
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
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey.trim())}&loading=async`;
    s.onload = () => setMapsReady(true);
    s.onerror = () => setMapLoadError('Could not load location search. Try GPS or check the API key.');
    document.head.appendChild(s);
  }, [active, mapsKey]);

  useEffect(() => {
    if (!active) {
      setMapLoadError(null);
      setSuggestions([]);
    }
  }, [active]);

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!mapsReady || !mapsKey?.trim() || input.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const lib = await getPlacesLib();
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new lib.AutocompleteSessionToken();
        }
        const { suggestions: results } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          includedPrimaryTypes: ['(cities)'],
          sessionToken: sessionTokenRef.current,
        });
        const mapped: PlaceSuggestion[] = results
          .filter((s) => s.placePrediction)
          .map((s) => ({
            placeId: s.placePrediction!.placeId,
            mainText: s.placePrediction!.mainText.text,
            secondaryText: s.placePrediction!.secondaryText.text,
          }));
        setSuggestions(mapped);
      } catch {
        setSuggestions([]);
      }
    },
    [mapsReady, mapsKey],
  );

  const debouncedFetch = useCallback(
    (input: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(input), 250);
    },
    [fetchSuggestions],
  );

  const selectSuggestion = useCallback(
    async (suggestion: PlaceSuggestion) => {
      if (!mapsReady) return;
      try {
        const lib = await getPlacesLib();
        const { suggestions: results } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: `${suggestion.mainText}, ${suggestion.secondaryText}`,
          sessionToken: sessionTokenRef.current,
        });
        const match = results.find((s) => s.placePrediction?.placeId === suggestion.placeId);
        if (!match?.placePrediction) {
          onResolved(`${suggestion.mainText}, ${suggestion.secondaryText}`, 0, 0);
          setSuggestions([]);
          sessionTokenRef.current = null;
          return;
        }
        const place = match.placePrediction.toPlace();
        const { place: details } = await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });
        const loc = details.location;
        if (loc) {
          const addr = details.formattedAddress || details.displayName || `${suggestion.mainText}, ${suggestion.secondaryText}`;
          onResolved(addr, loc.lat(), loc.lng());
        } else {
          onResolved(`${suggestion.mainText}, ${suggestion.secondaryText}`, 0, 0);
        }
      } catch {
        onResolved(`${suggestion.mainText}, ${suggestion.secondaryText}`, 0, 0);
      }
      setSuggestions([]);
      sessionTokenRef.current = null;
    },
    [mapsReady, onResolved],
  );

  const requestCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setMapLoadError('Geolocation is not supported in this browser.');
      return;
    }
    setGeoLoading(true);
    setMapLoadError(null);

    if (Capacitor.isNativePlatform()) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const permission = await Geolocation.requestPermissions();
        if (permission.location !== 'granted') {
          setGeoLoading(false);
          setMapLoadError('Location permission was denied. Please enable it in your device settings.');
          return;
        }
      } catch {
        setGeoLoading(false);
        setMapLoadError('Could not request location permission.');
        return;
      }
    }

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
    suggestions,
    debouncedFetch,
    selectSuggestion,
    requestCurrentLocation,
  };
}
