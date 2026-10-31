import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Bilingual } from '../../types/farm';
import Card from './Card';

interface StateMessageProps {
  tone: 'loading' | 'error';
  title: Bilingual;
  text: Bilingual;
  action?: ReactNode;
}

export default function StateMessage({ tone, title, text, action }: StateMessageProps) {
  const { t } = useLanguage();
  const isError = tone === 'error';

  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      {isError ? (
        <AlertTriangle className="h-10 w-10 text-error-600" aria-hidden="true" />
      ) : (
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" aria-hidden="true" />
      )}
      <h2 className="text-xl font-semibold text-neutral-900">{t(title)}</h2>
      <p className="max-w-md text-base text-neutral-600">{t(text)}</p>
      {action}
    </Card>
  );
}
