import type { DailyForecast, WeatherForecast } from '../types/farm';

const DAILY_SAMPLE: Omit<DailyForecast, 'date'>[] = [
  { tempMax: 31, tempMin: 18, precipitation: 0, rainProbability: 10, humidity: 58, windSpeed: 9 },
  { tempMax: 32, tempMin: 19, precipitation: 0, rainProbability: 15, humidity: 61, windSpeed: 10 },
  { tempMax: 30, tempMin: 20, precipitation: 12.4, rainProbability: 75, humidity: 82, windSpeed: 16 },
  { tempMax: 27, tempMin: 19, precipitation: 6.1, rainProbability: 60, humidity: 84, windSpeed: 14 },
  { tempMax: 29, tempMin: 17, precipitation: 0, rainProbability: null, humidity: 70, windSpeed: 11 },
  { tempMax: 33, tempMin: 18, precipitation: 0, rainProbability: 5, humidity: 52, windSpeed: 8 },
  { tempMax: 34, tempMin: 20, precipitation: 0, rainProbability: 10, humidity: 49, windSpeed: 7 },
];

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildMockForecast(now: Date = new Date()): WeatherForecast {
  const daily = DAILY_SAMPLE.map((day, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    return { date: toLocalIsoDate(date), ...day };
  });

  return { source: null, fetchedAt: now.toISOString(), daily };
}
