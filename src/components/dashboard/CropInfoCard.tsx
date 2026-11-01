import { getCrop, getStage } from '../../data/crops';
import { useLanguage } from '../../i18n/LanguageContext';
import { copy } from '../../i18n/copy';
import type { FarmerInput } from '../../types/farm';
import { formatLongDate } from '../../utils/format';
import Card from '../ui/Card';

interface CropInfoCardProps {
  input: FarmerInput;
}

export default function CropInfoCard({ input }: CropInfoCardProps) {
  const { lang, t } = useLanguage();
  const crop = getCrop(input.cropId);
  const stage = getStage(input.cropId, input.stageId);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-neutral-900">{t(copy.cropInfoTitle)}</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-neutral-600">{t(copy.summaryCrop)}</dt>
          <dd className="text-base font-semibold text-neutral-900">{t(crop.name)}</dd>
          <dd className="text-sm text-neutral-600">{t(crop.description)}</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">{t(copy.stageLabel)}</dt>
          <dd className="text-base font-semibold text-neutral-900">{stage ? t(stage.label) : '-'}</dd>
          {stage && <dd className="text-sm text-neutral-600">{t(stage.description)}</dd>}
        </div>
        <div>
          <dt className="text-sm text-neutral-600">{t(copy.sowingLabel)}</dt>
          <dd className="text-base font-semibold text-neutral-900">
            {input.sowingDate ? formatLongDate(input.sowingDate, lang) : t(copy.notProvided)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
