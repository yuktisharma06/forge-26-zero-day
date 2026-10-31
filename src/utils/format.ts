import type { Language } from '../types/farm';

const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

export function isForecastStale(fetchedAt: string, now: number = Date.now()): boolean {
  return now - Date.parse(fetchedAt) > STALE_AFTER_MS;
}

function localeFor(lang: Language): string {
  return lang === 'hi' ? 'hi-IN' : 'en-IN';
}

export function formatDayLabel(isoDate: string, lang: Language): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(localeFor(lang), { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

export function formatLongDate(isoDate: string, lang: Language): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(localeFor(lang), { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export function formatTime(isoDateTime: string, lang: Language): string {
  return new Intl.DateTimeFormat(localeFor(lang), { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(
    new Date(isoDateTime),
  );
}
