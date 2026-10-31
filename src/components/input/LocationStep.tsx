import { AlertTriangle, LocateFixed, MapPin } from 'lucide-react';
import { useState } from 'react';
import Button from '../ui/Button';
import { copy } from '../../i18n/copy';
import { useLanguage } from '../../i18n/LanguageContext';
import { SAHARANPUR_DISTRICT_BOUNDS, SAHARANPUR_LOCATIONS } from '../../data/locations';
import type { Bilingual, FarmerLocation } from '../../types/farm';

interface LocationStepProps {
  value: FarmerLocation | null;
  onChange: (location: FarmerLocation) => void;
}

function isInsideDistrict(latitude: number, longitude: number): boolean {
  const bounds = SAHARANPUR_DISTRICT_BOUNDS;
  return (
    latitude >= bounds.minLatitude &&
    latitude <= bounds.maxLatitude &&
    longitude >= bounds.minLongitude &&
    longitude <= bounds.maxLongitude
  );
}

export default function LocationStep({ value, onChange }: LocationStepProps) {
  const { t } = useLanguage();
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<Bilingual | null>(null);

  function requestGps() {
    if (!navigator.geolocation) {
      setGpsError(copy.errors.gpsUnavailable);
      return;
    }

    setLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!isInsideDistrict(coords.latitude, coords.longitude)) {
          setGpsError(copy.errors.gpsOutsideRegion);
          return;
        }
        onChange({
          id: 'gps',
          name: { hi: 'मेरी वर्तमान लोकेशन', en: 'My current location' },
          source: 'gps',
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      (error) => {
        setLocating(false);
        setGpsError(error.code === error.PERMISSION_DENIED ? copy.errors.gpsDenied : copy.errors.gpsUnavailable);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Button variant="secondary" fullWidth onClick={requestGps} disabled={locating} icon={<LocateFixed className="h-5 w-5" aria-hidden="true" />}>
        {locating ? t(copy.gpsLocating) : t(copy.useGps)}
      </Button>

      {gpsError && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t(gpsError)}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">{t(copy.locationListTitle)}</h2>
        {SAHARANPUR_LOCATIONS.map((location) => {
          const selected = value?.id === location.id;
          return (
            <button
              key={location.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(location)}
              className={`flex min-h-14 items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left text-lg font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 active:scale-[0.99] ${
                selected ? 'border-primary-600 bg-primary-50 text-primary-900' : 'border-neutral-200 text-neutral-900 hover:border-primary-500'
              }`}
            >
              <MapPin className={`h-6 w-6 shrink-0 ${selected ? 'text-primary-600' : 'text-neutral-500'}`} aria-hidden="true" />
              {t(location.name)}
            </button>
          );
        })}
      </div>

      {value?.source === 'gps' && (
        <p className="text-sm text-neutral-600">{t(value.name)}</p>
      )}
    </div>
  );
}
