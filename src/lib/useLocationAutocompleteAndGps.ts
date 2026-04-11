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

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
      text?: { text: string };
    };
  }>;
};

type PlaceDetailsResponse = {
  location?: { latitude: number; longitude: number };
  displayName?: { text: string };
  formattedAddress?: string;
};

async function fetchAutocompleteSuggestions(
  input: string,
  apiKey: string,
): Promise<PlaceSuggestion[]> {
  const response = await fetch(
    'https://places.googleapis.com/v1/places:autocomplete',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1'],
        languageCode: 'en',
      }),
    },
  );
  if (!response.ok) return [];
  const data = (await response.json()) as AutocompleteResponse;
  if (!data.suggestions) return [];
  return data.suggestions
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction!.placeId,
      mainText:
        s.placePrediction!.structuredFormat?.mainText?.text ??
        s.placePrediction!.text?.text ??
        '',
      secondaryText:
        s.placePrediction!.structuredFormat?.secondaryText?.text ?? '',
    }));
}

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<{ label: string; lat: number; lng: number } | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=location,displayName,formattedAddress`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as PlaceDetailsResponse;
  if (!data.location) return null;
  const label =
    data.formattedAddress ?? data.displayName?.text ?? 'Unknown location';
  return { label, lat: data.location.latitude, lng: data.location.longitude };
}

export function useLocationAutocompleteAndGps(options: {
  active: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onResolved: (label: string, lat: number, lng: number) => void;
}) {
  const { active, onResolved } = options;
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapsKey = LOCATION_MAPS_KEY;
  const mapsReady = !!mapsKey?.trim();

  useEffect(() => {
    if (!active) {
      setMapLoadError(null);
      setSuggestions([]);
    }
  }, [active]);

  const fetchSuggestionsCb = useCallback(
    async (input: string) => {
      if (!mapsKey?.trim() || input.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const results = await fetchAutocompleteSuggestions(input, mapsKey.trim());
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    },
    [mapsKey],
  );

  const debouncedFetch = useCallback(
    (input: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestionsCb(input), 250);
    },
    [fetchSuggestionsCb],
  );

  const selectSuggestion = useCallback(
    async (suggestion: PlaceSuggestion) => {
      if (!mapsKey?.trim()) return;
      try {
        const details = await fetchPlaceDetails(suggestion.placeId, mapsKey.trim());
        if (details) {
          onResolved(details.label, details.lat, details.lng);
        } else {
          onResolved(`${suggestion.mainText}, ${suggestion.secondaryText}`, 0, 0);
        }
      } catch {
        onResolved(`${suggestion.mainText}, ${suggestion.secondaryText}`, 0, 0);
      }
      setSuggestions([]);
    },
    [mapsKey, onResolved],
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
