import { Sparkles, RefreshCw, TriangleAlert } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import SpeakerButton from '../ui/SpeakerButton';
import { copy } from '../../i18n/copy';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Bilingual } from '../../types/farm';

interface AiExplanationCardProps {
  summary: Bilingual | null;
  onRetry: () => void;
}

export default function AiExplanationCard({ summary, onRetry }: AiExplanationCardProps) {
  const { t } = useLanguage();

  if (!summary) {
    return (
      <Card as="section" className="flex flex-col gap-4 bg-warning-50">
        <p className="flex items-start gap-2 text-base text-warning-900">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {t(copy.aiUnavailable)}
        </p>
        <div>
          <Button variant="secondary" onClick={onRetry} icon={<RefreshCw className="h-5 w-5" aria-hidden="true" />}>
            {t(copy.retry)}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card as="section" className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
        <Sparkles className="h-5 w-5 text-accent-600" aria-hidden="true" />
        {t(copy.aiTitle)}
      </h2>
      <p className="text-lg leading-relaxed text-neutral-900">{t(summary)}</p>
      <SpeakerButton text={t(summary)} />
    </Card>
  );
}
