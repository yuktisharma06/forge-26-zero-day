import { AlertTriangle, CircleHelp, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Bilingual } from '../../types/farm';
import type { RiskTone } from '../../utils/risk';

const TONE_LABELS: Record<RiskTone, Bilingual> = {
  high: { hi: 'उच्च जोखिम', en: 'High risk' },
  moderate: { hi: 'मध्यम जोखिम', en: 'Moderate risk' },
  low: { hi: 'कम जोखिम', en: 'Low risk' },
  potential: { hi: 'संभावित जोखिम (पुष्टि बाकी)', en: 'Potential risk (not yet validated)' },
};

const TONE_CLASSES: Record<RiskTone, string> = {
  high: 'bg-error-100 text-error-900 ring-error-600',
  moderate: 'bg-warning-100 text-warning-900 ring-warning-500',
  low: 'bg-success-100 text-success-700 ring-success-600',
  potential: 'bg-accent-100 text-accent-700 ring-accent-600',
};

const TONE_ICONS: Record<RiskTone, typeof ShieldAlert> = {
  high: ShieldAlert,
  moderate: AlertTriangle,
  low: ShieldCheck,
  potential: Info,
};

interface RiskBadgeProps {
  tone: RiskTone;
}

export default function RiskBadge({ tone }: RiskBadgeProps) {
  const { t } = useLanguage();
  const Icon = TONE_ICONS[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${TONE_CLASSES[tone]}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t(TONE_LABELS[tone])}
    </span>
  );
}

export function InsufficientDataBadge() {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700 ring-1 ring-inset ring-neutral-500">
      <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t({ hi: 'जानकारी अपर्याप्त', en: 'Insufficient data' })}
    </span>
  );
}
