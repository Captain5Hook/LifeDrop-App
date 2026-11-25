import {
  DEFAULT_ELIGIBILITY_RULES,
  type EligibilityRulesConfig,
} from '../config/eligibilityRules';

export type BiologicalSex = 'male' | 'female' | 'other';

export interface EligibilityInput {
  age: number;
  weightKg: number;
  haemoglobinGdL: number | null; // null if unknown (will be tested at blood bank)
  sex: BiologicalSex;
  lastConfirmedDonationDate: string | null; // ISO date YYYY-MM-DD
  deferrals: {
    feverOrIllness: boolean;
    pregnantOrBreastfeeding: boolean;
    recentTattooOrPiercing: boolean;
    recentSurgery: boolean;
    restrictedMedication: boolean;
    recentVaccination: boolean;
    alcoholLast24h: boolean;
  };
}

export interface EligibilityEvaluation {
  status: 'eligible' | 'deferred' | 'ineligible';
  headline: string;
  reasons: string[];
  nextEligibleDate: string | null;
  daysRemaining: number;
  guidelineNotice: string;
  disclaimer: string;
}

export function computeNextEligibleDate(
  lastConfirmedDonationDate: string | null,
  sex: BiologicalSex,
  rules: EligibilityRulesConfig = DEFAULT_ELIGIBILITY_RULES,
): { nextDate: string | null; daysRemaining: number } {
  if (!lastConfirmedDonationDate) {
    return { nextDate: null, daysRemaining: 0 };
  }

  const parsed = new Date(lastConfirmedDonationDate);
  if (Number.isNaN(parsed.getTime())) {
    return { nextDate: null, daysRemaining: 0 };
  }

  const gapDays = sex === 'male' ? rules.maleGapDays : rules.femaleGapDays;
  const target = new Date(parsed.getTime() + gapDays * 86400000);
  const now = new Date();
  const diffDays = Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / 86400000),
  );

  return {
    nextDate: target.toISOString().slice(0, 10),
    daysRemaining: diffDays,
  };
}

export function evaluateEligibility(
  input: EligibilityInput,
  rules: EligibilityRulesConfig = DEFAULT_ELIGIBILITY_RULES,
): EligibilityEvaluation {
  const hardReasons: string[] = [];
  const tempReasons: string[] = [];

  if (input.age < rules.minAge) {
    hardReasons.push(`Minimum donor age is ${rules.minAge} years.`);
  } else if (input.age > rules.maxAge) {
    hardReasons.push(`Maximum routine donor age is ${rules.maxAge} years.`);
  }

  if (input.weightKg < rules.minWeightKg) {
    tempReasons.push(`Minimum weight required is ${rules.minWeightKg} kg.`);
  }

  if (
    input.haemoglobinGdL !== null &&
    input.haemoglobinGdL < rules.minHaemoglobinGdL
  ) {
    tempReasons.push(
      `Haemoglobin must be at least ${rules.minHaemoglobinGdL} g/dL (checked at the blood bank).`,
    );
  }

  const { nextDate, daysRemaining } = computeNextEligibleDate(
    input.lastConfirmedDonationDate,
    input.sex,
    rules,
  );

  if (daysRemaining > 0 && nextDate) {
    const gapMonths = input.sex === 'male' ? 3 : 4;
    tempReasons.push(
      `Wait ${daysRemaining} more day(s) (${gapMonths}-month gap between confirmed whole-blood donations; next eligible ${nextDate}).`,
    );
  }

  if (input.deferrals.feverOrIllness) {
    tempReasons.push('Wait until completely recovered from fever, cold, or infection.');
  }
  if (input.deferrals.pregnantOrBreastfeeding) {
    tempReasons.push('Temporary deferral during pregnancy or breastfeeding.');
  }
  if (input.deferrals.recentTattooOrPiercing) {
    tempReasons.push(
      `Wait ${rules.tattooDeferralMonths} months after a tattoo, piercing, or acupuncture.`,
    );
  }
  if (input.deferrals.recentSurgery) {
    tempReasons.push(
      `Wait ${rules.surgeryDeferralMonths}–12 months after major surgery (doctor decides).`,
    );
  }
  if (input.deferrals.restrictedMedication) {
    tempReasons.push('Check current medications (antibiotics/blood thinners) with the blood bank doctor.');
  }
  if (input.deferrals.recentVaccination) {
    tempReasons.push('Some vaccines require a short 14–28 day waiting period.');
  }
  if (input.deferrals.alcoholLast24h) {
    tempReasons.push(`Avoid alcohol for at least ${rules.alcoholDeferralHours} hours before donating.`);
  }

  if (hardReasons.length > 0) {
    return {
      status: 'ineligible',
      headline: 'Not eligible under age guidelines',
      reasons: [...hardReasons, ...tempReasons],
      nextEligibleDate: nextDate,
      daysRemaining,
      guidelineNotice: rules.guidelineNotice,
      disclaimer: rules.medicalDisclaimer,
    };
  }

  if (tempReasons.length > 0) {
    return {
      status: 'deferred',
      headline: 'Temporary deferral — check waiting period',
      reasons: tempReasons,
      nextEligibleDate: nextDate,
      daysRemaining,
      guidelineNotice: rules.guidelineNotice,
      disclaimer: rules.medicalDisclaimer,
    };
  }

  return {
    status: 'eligible',
    headline: 'You look eligible to donate whole blood!',
    reasons: [
      input.haemoglobinGdL === null
        ? 'Haemoglobin will be checked on-site (must be >= 12.5 g/dL).'
        : 'All basic screening checks passed.',
    ],
    nextEligibleDate: nextDate,
    daysRemaining: 0,
    guidelineNotice: rules.guidelineNotice,
    disclaimer: rules.medicalDisclaimer,
  };
}
