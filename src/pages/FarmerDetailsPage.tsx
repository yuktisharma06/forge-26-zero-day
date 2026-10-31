import { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Sprout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CropStep from '../components/input/CropStep';
import LocationStep from '../components/input/LocationStep';
import SowingDateStep from '../components/input/SowingDateStep';
import StageStep from '../components/input/StageStep';
import StepIndicator from '../components/input/StepIndicator';
import { copy } from '../i18n/copy';
import { useLanguage } from '../i18n/LanguageContext';
import { useFarmer } from '../context/FarmerContext';
import type { Bilingual, CropId, FarmerLocation } from '../types/farm';
import { validateStep, type FarmerDraft } from '../utils/farmerInputValidation';

const STEP_COUNT = copy.stepTitles.length;
const STEP_HELP: Bilingual[] = [copy.locationHelp, copy.cropHelp, copy.stageHelp, copy.sowingHelp];
const STEP_HEADINGS: Bilingual[] = [copy.locationTitle, copy.cropTitle, copy.stageTitle, copy.sowingTitle];
const EMPTY_DRAFT: FarmerDraft = { location: null, cropId: null, stageId: null, sowingDate: '' };

export default function FarmerDetailsPage() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { saveInput } = useFarmer();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<FarmerDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<Bilingual | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const isLastStep = step === STEP_COUNT - 1;

  function updateDraft(patch: Partial<FarmerDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
    setError(null);
  }

  function goBack() {
    setError(null);
    if (step === 0) {
      navigate('/');
      return;
    }
    setStep(step - 1);
  }

  function goNext() {
    const problem = validateStep(step, draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep(step + 1);
  }

  function submit() {
    const stepsWithProblems = Array.from({ length: STEP_COUNT }, (_, index) => index);
    const firstInvalidStep = stepsWithProblems.find((index) => validateStep(index, draft) !== null);
    if (firstInvalidStep !== undefined) {
      setStep(firstInvalidStep);
      setError(validateStep(firstInvalidStep, draft));
      return;
    }

    const { location, cropId, stageId } = draft;
    if (!location || !cropId || !stageId) {
      return;
    }

    if (!confirmed) {
      setError(copy.confirmRequired);
      return;
    }

    saveInput({ location, cropId, stageId, sowingDate: draft.sowingDate, language: lang });
    navigate('/dashboard');
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <LocationStep value={draft.location} onChange={(location: FarmerLocation) => updateDraft({ location })} />
        );
      case 1:
        return (
          <CropStep
            value={draft.cropId}
            onChange={(cropId: CropId) => updateDraft({ cropId, stageId: null })}
          />
        );
      case 2:
        return draft.cropId ? (
          <StageStep
            cropId={draft.cropId}
            value={draft.stageId}
            onChange={(stageId) => updateDraft({ stageId })}
          />
        ) : null;
      default:
        return <SowingDateStep draft={draft} onDateChange={(sowingDate) => updateDraft({ sowingDate })} />;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <StepIndicator current={step} total={STEP_COUNT} />

      <Card as="section" className="animate-fade-in-up">
        <div key={step} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-bold leading-tight text-neutral-900 md:text-3xl">
              <Sprout className="h-7 w-7 shrink-0 text-primary-600" aria-hidden="true" />
              {t(STEP_HEADINGS[step])}
            </h1>
            <p className="text-base text-neutral-600">{t(STEP_HELP[step])}</p>
          </div>

          {renderStep()}

          {isLastStep && (
            <label className="flex items-start gap-3 rounded-xl border-2 border-neutral-200 p-4 text-base text-neutral-900">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => {
                  setConfirmed(event.target.checked);
                  setError(null);
                }}
                className="mt-1 h-5 w-5 shrink-0 accent-primary-600"
              />
              <span>{t(copy.confirmDetails)}</span>
            </label>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-error-50 p-4 text-base font-medium text-error-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              {t(error)}
            </p>
          )}
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={goBack} icon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />}>
          {t(copy.back)}
        </Button>
        {isLastStep ? (
          <Button onClick={submit} className="min-w-0 flex-1 sm:min-w-44 sm:flex-none" icon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}>
            {t(copy.getAdvice)}
          </Button>
        ) : (
          <Button onClick={goNext} className="min-w-0 flex-1 sm:min-w-44 sm:flex-none" icon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}>
            {t(copy.next)}
          </Button>
        )}
      </div>
    </div>
  );
}
