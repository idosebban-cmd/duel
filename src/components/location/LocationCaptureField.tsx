import { useRef, useCallback } from 'react';
import { MapPin, Locate } from '../ui/Icons';
import { Input } from '../ui/Input';
import { useLocationAutocompleteAndGps, LOCATION_MAPS_KEY } from '../../lib/useLocationAutocompleteAndGps';

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

  const { geoLoading, mapLoadError, setMapLoadError, mapsKey, requestCurrentLocation } =
    useLocationAutocompleteAndGps({
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
      onChangeValue(e.target.value);
    },
    [onCoordsChange, onChangeValue, setMapLoadError],
  );

  return (
    <div>
      <Input
        dark={dark}
        label={label}
        placeholder={mapsKeyTrimmed ? 'Search for a city...' : 'Use GPS to set your area'}
        error={combinedError}
        success={!combinedError && !!value.trim() && hasCoords}
        leftIcon={<MapPin size={18} />}
        hint={
          mapsKeyTrimmed
            ? 'Pick a suggestion, or use GPS.'
            : 'Tap "Use My Current Location", or set VITE_GOOGLE_MAPS_KEY for city search.'
        }
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
      />
      <button
        type="button"
        onClick={requestCurrentLocation}
        disabled={geoLoading}
        className="mt-2 flex items-center gap-1.5 text-sm font-body font-medium disabled:opacity-50"
        style={{ color: '#FF9F1C' }}
      >
        <Locate size={14} />
        {geoLoading ? 'Getting location…' : 'Use My Current Location'}
      </button>
    </div>
  );
}

export { LOCATION_MAPS_KEY };
