import { useMemo } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StateMessage from '../components/ui/StateMessage';
import AiExplanationCard from '../components/dashboard/AiExplanationCard';
import CropInfoCard from '../components/dashboard/CropInfoCard';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import RiskSection from '../components/dashboard/RiskSection';
import WeatherPanel from '../components/dashboard/WeatherPanel';
import { useFarmer } from '../context/FarmerContext';
import { useAdvisory } from '../hooks/useAdvisory';
import { copy } from '../i18n/copy';
import { useLanguage } from '../i18n/LanguageContext';
import type { AdvisoryErrorCode } from '../services/advisoryContract';
import { ADVISORY_USES_MOCK } from '../services/advisoryService';
import { isForecastStale } from '../utils/format';

function errorCopyFor(code: AdvisoryErrorCode) {
  switch (code) {
    case 'INVALID_INPUT':
      return copy.invalidInputText;
    case 'LOCATION_NOT_FOUND':
      return copy.locationNotFoundText;
    case 'WEATHER_API_ERROR':
      return copy.weatherErrorText;
    case 'INTERNAL_SERVER_ERROR':
      return copy.serverErrorText;
    case 'TIMEOUT':
      return copy.timeoutText;
    case 'INVALID_RESPONSE':
      return copy.invalidResponseText;
    case 'NETWORK_ERROR':
      return copy.networkErrorText;
    default:
      return copy.errorText;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { input } = useFarmer();
  const advisoryInput = useMemo(() => (input ? { ...input, language: lang } : null), [input, lang]);
  const { state, refresh } = useAdvisory(advisoryInput);

  if (!input) {
    return <Navigate to="/details" replace />;
  }

  const loading = state.status === 'loading';
  const fetchedAt = state.status === 'success' ? state.data.forecast.fetchedAt : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" onClick={() => navigate('/details')} icon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />}>
          {t(copy.changeDetails)}
        </Button>
      </div>

      <DashboardSummary input={input} fetchedAt={fetchedAt} refreshing={loading} onRefresh={refresh} />

      {state.status === 'loading' && (
        <StateMessage tone="loading" title={copy.loadingTitle} text={copy.loadingText} />
      )}

      {state.status === 'error' && (
        <StateMessage
          tone="error"
          title={copy.errorTitle}
          text={errorCopyFor(state.code)}
          action={
            <Button onClick={refresh}>{t(copy.retry)}</Button>
          }
        />
      )}

      {state.status === 'success' && (
        <>
          {isForecastStale(state.data.forecast.fetchedAt) && (
            <p role="alert" className="rounded-xl bg-warning-100 p-4 text-base font-semibold text-warning-900">
              {t(copy.staleWarning)}
            </p>
          )}

          {ADVISORY_USES_MOCK && (
            <p className="flex items-center gap-2 text-sm text-accent-700">
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(copy.demoNotice)}
            </p>
          )}

          <RiskSection
            assessmentStatus={state.data.assessmentStatus}
            risks={state.data.risks}
            insufficientData={state.data.insufficientData}
          />

          <AiExplanationCard
            summary={state.data.aiSummary}
            actions={state.data.actions}
            aiFallback={state.data.aiFallback}
            onRetry={refresh}
          />

          <WeatherPanel forecast={state.data.forecast} />

          <CropInfoCard input={input} />

          <Card as="section" className="bg-neutral-100 border-neutral-300">
            <p className="text-sm leading-relaxed text-neutral-700">{t(copy.disclaimer)}</p>
          </Card>
        </>
      )}
    </div>
  );
}
