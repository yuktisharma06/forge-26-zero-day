import { useLanguage } from '../../i18n/LanguageContext';
import { copy } from '../../i18n/copy';
import { getCrop, getStage } from '../../data/crops';
import { formatLongDate } from '../../utils/format';
import { sowingDateBounds, type FarmerDraft } from '../../utils/farmerInputValidation';

interface SowingDateStepProps {
  draft: FarmerDraft;
  onDateChange: (sowingDate: string) => void;
}

export default function SowingDateStep({ draft, onDateChange }: SowingDateStepProps) {
  const { lang, t } = useLanguage();
  const bounds = sowingDateBounds();
  const crop = draft.cropId ? getCrop(draft.cropId) : null;
  const stage = draft.cropId && draft.stageId ? getStage(draft.cropId, draft.stageId) : null;

  const rows: { label: string; value: string }[] = [
    { label: t(copy.summaryLocation), value: draft.location ? t(draft.location.name) : '-' },
    { label: t(copy.summaryCrop), value: crop ? t(crop.name) : '-' },
    { label: t(copy.summaryStage), value: stage ? t(stage.label) : '-' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="sowing-date" className="text-base font-semibold text-neutral-900">
          {t(copy.sowingLabel)}
        </label>
        <input
          id="sowing-date"
          type="date"
          min={bounds.min}
          max={bounds.max}
          lang={lang === 'hi' ? 'hi-IN' : 'en-IN'}
          value={draft.sowingDate}
          onChange={(event) => onDateChange(event.target.value)}
          className="min-h-14 w-full rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-lg text-neutral-900 transition focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-100"
        />
        {draft.sowingDate && (
          <p className="text-sm text-neutral-600">{formatLongDate(draft.sowingDate, lang)}</p>
        )}
      </div>

      <div className="rounded-xl bg-neutral-50 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600">{t(copy.reviewTitle)}</h3>
        <dl className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 text-base">
              <dt className="text-neutral-600">{row.label}</dt>
              <dd className="text-right font-semibold text-neutral-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
