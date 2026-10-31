import { Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Bilingual } from '../../types/farm';

interface OptionCardProps {
  title: Bilingual;
  description?: Bilingual;
  imageUrl: string;
  selected: boolean;
  onSelect: () => void;
}

export default function OptionCard({ title, description, imageUrl, selected, onSelect }: OptionCardProps) {
  const { lang, t } = useLanguage();
  const otherLang = lang === 'hi' ? 'en' : 'hi';

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 active:scale-[0.98] ${
        selected ? 'border-primary-600 ring-4 ring-primary-100' : 'border-neutral-200 hover:-translate-y-0.5 hover:border-primary-500 hover:shadow-md'
      }`}
    >
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
      />
      {selected && (
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow">
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <span className="flex flex-col gap-1 p-4">
        <span className="text-lg font-semibold text-neutral-900">{t(title)}</span>
        <span className="text-sm text-neutral-600">{title[otherLang]}</span>
        {description && <span className="mt-1 text-sm text-neutral-600">{t(description)}</span>}
      </span>
    </button>
  );
}
