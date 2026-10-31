import { Sprout } from 'lucide-react';
import { Outlet, Link } from 'react-router-dom';
import { copy } from '../../i18n/copy';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageToggle from '../ui/LanguageToggle';

export default function AppLayout() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Sprout className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-bold text-neutral-900">{t(copy.appName)}</span>
              <span className="hidden text-xs text-neutral-600 sm:block">{t(copy.appTagline)}</span>
            </span>
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
