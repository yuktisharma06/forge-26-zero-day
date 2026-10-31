import { CheckCircle2, CircleHelp } from 'lucide-react';
import Card from '../ui/Card';
import { InsufficientDataBadge } from '../ui/RiskBadge';
import { copy } from '../../i18n/copy';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Bilingual, WeatherRisk } from '../../types/farm';
import RiskAdvisoryCard from './RiskAdvisoryCard';

interface RiskSectionProps {
  risks: WeatherRisk[];
  insufficientData: Bilingual | null;
}

export default function RiskSection({ risks, insufficientData }: RiskSectionProps) {
  const { t } = useLanguage();
  const [priorityRisk, ...otherRisks] = risks;

  if (!priorityRisk) {
    return insufficientData ? (
      <Card as="section" className="flex flex-col gap-3 border-neutral-300">
        <InsufficientDataBadge />
        <h2 className="text-xl font-bold text-neutral-900">{t(copy.insufficientTitle)}</h2>
        <p className="flex gap-2 text-base text-neutral-700">
          <CircleHelp className="mt-1 h-5 w-5 shrink-0 text-neutral-500" aria-hidden="true" />
          {t(insufficientData)}
        </p>
      </Card>
    ) : (
      <Card as="section" className="flex flex-col gap-3 border-success-600/30 bg-success-50">
        <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-900">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success-700" aria-hidden="true" />
          {t(copy.noRiskTitle)}
        </h2>
        <p className="text-base text-neutral-700">{t(copy.noRiskText)}</p>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <RiskAdvisoryCard risk={priorityRisk} priority />
      {otherRisks.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-neutral-900">{t(copy.otherRisksTitle)}</h2>
          {otherRisks.map((risk) => (
            <RiskAdvisoryCard key={risk.id} risk={risk} />
          ))}
        </div>
      )}
    </section>
  );
}
