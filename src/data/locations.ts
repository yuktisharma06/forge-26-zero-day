import type { FarmerLocation } from '../types/farm';

export const SAHARANPUR_LOCATIONS: FarmerLocation[] = [
  {
    id: 'saharanpur-city',
    name: { hi: 'सहारनपुर शहर', en: 'Saharanpur City' },
    source: 'list',
    latitude: 29.968,
    longitude: 77.551,
  },
  {
    id: 'deoband',
    name: { hi: 'देवबंद', en: 'Deoband' },
    source: 'list',
    latitude: 29.683,
    longitude: 77.683,
  },
];

export const SAHARANPUR_DISTRICT_BOUNDS = {
  minLatitude: 29.4,
  maxLatitude: 30.3,
  minLongitude: 77.0,
  maxLongitude: 78.0,
};
