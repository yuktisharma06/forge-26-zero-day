import { copy } from '../i18n/copy';
import type { Bilingual, CropId, FarmerLocation } from '../types/farm';

export const SOWING_DATE_MAX_AGE_DAYS = 365;

export interface FarmerDraft {
  location: FarmerLocation | null;
  cropId: CropId | null;
  stageId: string | null;
  sowingDate: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validateSowingDate(sowingDate: string, today: Date = new Date()): Bilingual | null {
  if (!sowingDate) return copy.errors.dateMissing;
  if (!ISO_DATE_PATTERN.test(sowingDate) || Number.isNaN(Date.parse(sowingDate))) return copy.errors.dateInvalid;

  if (sowingDate > localIsoDate(today)) return copy.errors.dateFuture;

  const oldest = new Date(today);
  oldest.setDate(today.getDate() - SOWING_DATE_MAX_AGE_DAYS);
  if (sowingDate < localIsoDate(oldest)) return copy.errors.dateTooOld;

  return null;
}

export function sowingDateBounds(today: Date = new Date()): { min: string; max: string } {
  const oldest = new Date(today);
  oldest.setDate(today.getDate() - SOWING_DATE_MAX_AGE_DAYS);
  return { min: localIsoDate(oldest), max: localIsoDate(today) };
}

export function validateStep(step: number, draft: FarmerDraft): Bilingual | null {
  if (step === 0) return draft.location ? null : copy.errors.location;
  if (step === 1) return draft.cropId ? null : copy.errors.crop;
  if (step === 2) return draft.stageId ? null : copy.errors.stage;
  return validateSowingDate(draft.sowingDate);
}
