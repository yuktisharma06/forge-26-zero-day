import { RefreshCw, Clock3, MapPin } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { copy } from '../../i18n/copy';
import { useLanguage } from '../../i18n/LanguageContext';
import { getCrop, getStage } from '../../data/crops';
import type { FarmerInput } from '../../types/farm';
import { formatTime } from '../../utils/format';

interface DashboardSummaryProps {
  input: FarmerInput;
  fetchedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export default function DashboardSummary({ input, fetchedAt, refreshing, onRefresh }: DashboardSummaryProps) {
  const { lang, t } = useLanguage();
  const crop = getCrop(input.cropId);
  const stage = getStage(input.cropId, input.stageId);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        {stage && (
          <img
            src={stage.imageUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-xl object-cover md:h-24 md:w-24"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold text-primary-700">{t(crop.name)}</p>
          <h2 className="text-xl font-bold text-neutral-900 md:text-2xl">{stage ? t(stage.label) : '-'}</h2>
          <p className="flex items-center gap-1.5 text-sm text-neutral-600">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t(input.location.name)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {fetchedAt && (
          <p className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {`${t(copy.lastUpdated)}: ${formatTime(fetchedAt, lang)}`}
          </p>
        )}
        <Button variant="secondary" onClick={onRefresh} disabled={refreshing} icon={<RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />}>
          {refreshing ? t(copy.refreshing) : t(copy.refresh)}
        </Button>
      </div>
    </Card>
  );
}
