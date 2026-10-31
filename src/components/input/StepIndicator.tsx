import { useLanguage } from '../../i18n/LanguageContext';
import { copy } from '../../i18n/copy';

interface StepIndicatorProps {
  current: number;
  total: number;
}

export default function StepIndicator({ current, total }: StepIndicatorProps) {
  const { t } = useLanguage();
  const progress = ((current + 1) / total) * 100;
  const stepTitle = copy.stepTitles[current];

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-neutral-700">
        <span>
          {t(copy.step)} {current + 1} / {total}
        </span>
        <span>{t(stepTitle)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
        <div className="h-full rounded-full bg-primary-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
