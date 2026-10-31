import { ExternalLink, ListChecks, Sprout } from 'lucide-react';
import Card from '../ui/Card';
import RiskBadge from '../ui/RiskBadge';
import SpeakerButton from '../ui/SpeakerButton';
import { copy } from '../../i18n/copy';
import { useLanguage } from '../../i18n/LanguageContext';
import type { WeatherRisk } from '../../types/farm';
import { buildSpeechText, riskTone } from '../../utils/risk';

interface RiskAdvisoryCardProps {
  risk: WeatherRisk;
  priority?: boolean;
}

export default function RiskAdvisoryCard({ risk, priority = false }: RiskAdvisoryCardProps) {
  const { lang, t } = useLanguage();

  return (
    <Card as="article" className={`flex flex-col gap-5 ${priority ? 'border-2 border-primary-600 ring-4 ring-primary-100' : ''}`}>
      <div className="flex flex-col gap-3">
        {priority && (
          <p className="text-sm font-bold uppercase tracking-wide text-primary-700">{t(copy.priorityLabel)}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge tone={riskTone(risk)} />
        </div>
        <h3 className="text-xl font-bold leading-snug text-neutral-900">{t(risk.title)}</h3>
        <p className="text-sm text-neutral-600">
          {t(copy.periodTitle)}: {t(risk.forecastPeriod)}
        </p>
      </div>

      <section className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-neutral-700">{t(copy.conditionTitle)}</h4>
        <p className="text-base text-neutral-900">{t(risk.weatherCondition)}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-neutral-700">{t(copy.whyTitle)}</h4>
        <p className="text-base leading-relaxed text-neutral-900">{t(risk.whyItMatters)}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          {t(copy.precautionsTitle)}
        </h4>
        <ul className="flex flex-col gap-2">
          {risk.precautions.map((precaution) => (
            <li key={precaution.en} className="flex gap-2 text-base text-neutral-900">
              <Sprout className="mt-1 h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
              {t(precaution)}
            </li>
          ))}
        </ul>
      </section>

      {risk.sources.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <h4 className="text-sm font-semibold text-neutral-700">{t(copy.sourcesTitle)}</h4>
          <ul className="flex flex-col gap-1">
            {risk.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 underline underline-offset-2 hover:text-accent-600"
                >
                  {source.name}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {priority && <SpeakerButton text={buildSpeechText(risk, lang)} />}
    </Card>
  );
}
