import { useLanguage } from '../../i18n/LanguageContext';
import type { Language } from '../../types/farm';

const OPTIONS: { value: Language; label: string; ariaLabel: string }[] = [
  { value: 'hi', label: 'हिन्दी', ariaLabel: 'Hindi' },
  { value: 'en', label: 'English', ariaLabel: 'English' },
];

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div role="group" aria-label="Language / भाषा" className="inline-flex rounded-full border border-neutral-200 bg-white p-1">
      {OPTIONS.map((option) => {
        const selected = option.value === lang;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.ariaLabel}
            onClick={() => setLang(option.value)}
            className={`min-h-9 rounded-full px-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 ${
              selected ? 'bg-primary-600 text-white' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
