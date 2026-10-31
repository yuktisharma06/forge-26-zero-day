import { ArrowRight, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { copy } from '../i18n/copy';
import { useLanguage } from '../i18n/LanguageContext';

const HOME_STEPS = [copy.homeStep1, copy.homeStep2, copy.homeStep3];

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <section className="animate-fade-in-up flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-primary-600 text-white shadow-lg">
          <Sprout className="h-10 w-10" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold leading-tight text-neutral-900 md:text-4xl">{t(copy.appName)}</h1>
          <p className="text-lg font-semibold text-primary-700">{t(copy.appTagline)}</p>
          <p className="max-w-xl text-base leading-relaxed text-neutral-700">{t(copy.homeIntro)}</p>
        </div>
      </section>

      <Card as="section" className="animate-fade-in-up flex flex-col gap-4">
        <ol className="flex flex-col gap-4">
          {HOME_STEPS.map((step, index) => (
            <li key={index} className="flex items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                {index + 1}
              </span>
              <span className="text-base text-neutral-800">{t(step)}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="animate-fade-in-up flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          fullWidth
          className="sm:w-auto sm:px-8 sm:text-lg"
          onClick={() => navigate('/details')}
          icon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
        >
          {t(copy.getStarted)}
        </Button>
      </div>
    </div>
  );
}
