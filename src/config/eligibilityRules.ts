export interface EligibilityRulesConfig {
  minAge: number;
  maxAge: number;
  minWeightKg: number;
  minHaemoglobinGdL: number;
  maleGapDays: number;
  femaleGapDays: number;
  tattooDeferralMonths: number;
  surgeryDeferralMonths: number;
  alcoholDeferralHours: number;
  guidelineNotice: string;
  medicalDisclaimer: string;
}

export const DEFAULT_ELIGIBILITY_RULES: EligibilityRulesConfig = {
  minAge: 18,
  maxAge: 65,
  minWeightKg: 45,
  minHaemoglobinGdL: 12.5,
  maleGapDays: 90, // 3 months
  femaleGapDays: 120, // 4 months
  tattooDeferralMonths: 6,
  surgeryDeferralMonths: 6,
  alcoholDeferralHours: 24,
  guidelineNotice:
    'Verify against the latest NBTC / national guidelines before launch.',
  medicalDisclaimer:
    'This is screening guidance only. Only the blood bank medical officer confirms final donation eligibility after on-site testing.',
};

export const POST_DONATION_CARE_TIPS = [
  'Rest for 10–15 minutes at the blood centre and enjoy the light refreshment provided.',
  'Drink extra water, ORS, or fruit juice over the next 24 hours to replenish fluid volume.',
  'Eat an iron-rich balanced meal later in the day (spinach, lentils, dates, or fortified grains).',
  'Avoid heavy lifting, intense workouts, and long driving for the rest of the day.',
  'Keep the bandage on for at least 4–6 hours and keep the puncture site clean and dry.',
];
