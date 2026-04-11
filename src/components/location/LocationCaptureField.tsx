import { useRef, useCallback } from 'react';
import { MapPin, Locate } from '../ui/Icons';
import { Input } from '../ui/Input';
import {
  useLocationAutocompleteAndGps,
  LOCATION_MAPS_KEY,
  type PlaceSuggestion,
} from '../../lib/useLocationAutocompleteAndGps';

export type LocationCaptureFieldProps = {
  active: boolean;
  value: string;
  onChangeValue: (v: string) => void;
  latitude: number | null;
  longitude: number | null;
  onCoordsChange: (lat: number | null, lng: number | null) => void;
  error?: string | null;
  label?: string;
  dark?: boolean;
};

export function LocationCaptureField({
  active,
  value,
  onChangeValue,
  latitude,
  longitude,
  onCoordsChange,
  error,
  label,
  dark = true,
}: LocationCaptureFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onResolved = useCallback(
    (addr: string, lat: number, lng: number) => {
      onChangeValue(addr);
      onCoordsChange(lat, lng);
    },
    [onChangeValue, onCoordsChange],
  );

  const {
    geoLoading,
    mapLoadError,
    setMapLoadError,
    mapsKey,
    suggestions,
    debouncedFetch,
    selectSuggestion,
    requestCurrentLocation,
  } = useLocationAutocompleteAndGps({
    active,
    inputRef,
    onResolved,
  });

  const mapsKeyTrimmed = mapsKey?.trim();
  const hasCoords = latitude != null && longitude != null;
  const combinedError = error || mapLoadError || undefined;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onCoordsChange(null, null);
      setMapLoadError(null);
      const v = e.target.value;
      onChangeValue(v);
      debouncedFetch(v);
    },
    [onCoordsChange, onChangeValue, setMapLoadError, debouncedFetch],
  );

  const handleSelect = useCallback(
    (suggestion: PlaceSuggestion) => {
      onChangeValue(suggestion.mainText + ', ' + suggestion.secondaryText);
      void selectSuggestion(suggestion);
    },
    [onChangeValue, selectSuggestion],
  );

  return (
    <div className="relative">
      <Input
        dark={dark}
        label={label}
        placeholder={mapsKeyTrimmed ? 'Search for a city...' : 'Use GPS to set your area'}
        error={combinedError}
        success={!combinedError && !!value.trim() && hasCoords}
        leftIcon={<MapPin size={20} />}
        hint={
          mapsKeyTrimmed
            ? 'Pick a suggestion, or use GPS.'
            : 'Tap "Use My Current Location", or set VITE_GOOGLE_MAPS_KEY for city search.'
        }
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        autoComplete="off"
      />

      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
                onClick={() => handleSelect(s)}
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-[#FF9F1C]" />
                <span>
                  <span className="font-body text-sm font-medium text-white">{s.mainText}</span>
                  <span className="ml-1 font-body text-xs text-white/50">{s.secondaryText}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={requestCurrentLocation}
        disabled={geoLoading}
        className={`mt-2 flex items-center gap-1.5 font-body text-ui-body font-medium ${geoLoading ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
        style={{ color: '#FF9F1C' }}
      >
        <Locate size={20} />
        {geoLoading ? 'Getting location…' : 'Use My Current Location'}
      </button>
    </div>
  );
}

export { LOCATION_MAPS_KEY };
