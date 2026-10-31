import { CloudRain, Droplets, Thermometer, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import Card from '../ui/Card';
import { copy } from '../../i18n/copy';
import { useLanguage } from '../../i18n/LanguageContext';
import type { DailyForecast, WeatherForecast } from '../../types/farm';
import { formatDayLabel } from '../../utils/format';

interface WeatherPanelProps {
  forecast: WeatherForecast;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-neutral-50 p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
        {icon}
        {label}
      </span>
      <span className="text-lg font-bold text-neutral-900">{value}</span>
    </div>
  );
}

function DayCard({ day }: { day: DailyForecast }) {
  const { lang } = useLanguage();
  const rainy = day.rainProbability !== null && day.rainProbability >= 50;

  return (
    <div className="flex min-w-24 flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-center">
      <span className="text-sm font-semibold text-neutral-800">{formatDayLabel(day.date, lang)}</span>
      {rainy ? (
        <CloudRain className="h-7 w-7 text-accent-600" aria-hidden="true" />
      ) : (
        <Thermometer className="h-7 w-7 text-warning-700" aria-hidden="true" />
      )}
      <span className="text-sm font-bold text-neutral-900">
        {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
      </span>
      <span className="flex items-center gap-1 text-xs text-neutral-600">
        <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
        {day.rainProbability === null ? '-' : `${day.rainProbability}%`}
      </span>
    </div>
  );
}

export default function WeatherPanel({ forecast }: WeatherPanelProps) {
  const { t } = useLanguage();
  const today = forecast.daily[0];

  if (!today) {
    return null;
  }

  return (
    <Card as="section" className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-neutral-900">{t(copy.weatherTitle)}</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">{t(copy.currentWeather)}</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            icon={<Thermometer className="h-3.5 w-3.5" aria-hidden="true" />}
            label={t(copy.temperature)}
            value={`${Math.round(today.tempMax)}° / ${Math.round(today.tempMin)}°`}
          />
          <Metric
            icon={<CloudRain className="h-3.5 w-3.5" aria-hidden="true" />}
            label={t(copy.rainChance)}
            value={today.rainProbability === null ? '-' : `${today.rainProbability}%`}
          />
          <Metric
            icon={<Droplets className="h-3.5 w-3.5" aria-hidden="true" />}
            label={t(copy.humidity)}
            value={`${today.humidity}%`}
          />
          <Metric
            icon={<Wind className="h-3.5 w-3.5" aria-hidden="true" />}
            label={t(copy.wind)}
            value={`${Math.round(today.windSpeed)} km/h`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">{t(copy.forecastTitle)}</h3>
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {forecast.daily.map((day) => (
            <div key={day.date} className="snap-start">
              <DayCard day={day} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
