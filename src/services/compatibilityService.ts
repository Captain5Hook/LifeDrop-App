import { ORDERED_BLOOD_GROUPS, type BloodGroup } from '../data/seedStats';

export type BloodComponent = 'Whole Blood' | 'PRBC' | 'Platelets' | 'Plasma';

// Red Cell / Whole Blood compatibility: key = patient blood group, value = compatible donor groups
const RED_CELL_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

// Fresh Frozen Plasma compatibility reverses ABO rules (Rh matching less critical, AB is universal plasma donor)
const PLASMA_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'AB+': ['AB+', 'AB-'],
  'AB-': ['AB-', 'AB+'],
  'A+': ['A+', 'A-', 'AB+', 'AB-'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'B+': ['B+', 'B-', 'AB+', 'AB-'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'O+': ORDERED_BLOOD_GROUPS,
  'O-': ORDERED_BLOOD_GROUPS,
};

export function getCompatibleDonorGroups(
  recipientGroup: BloodGroup,
  component: BloodComponent = 'Whole Blood',
): BloodGroup[] {
  if (component === 'Plasma') {
    return PLASMA_COMPATIBILITY[recipientGroup];
  }
  return RED_CELL_COMPATIBILITY[recipientGroup];
}

export function getCompatibleRecipientGroups(
  donorGroup: BloodGroup,
  component: BloodComponent = 'Whole Blood',
): BloodGroup[] {
  return ORDERED_BLOOD_GROUPS.filter((recipient) =>
    getCompatibleDonorGroups(recipient, component).includes(donorGroup),
  );
}

export function isDonorCompatible(
  donorGroup: BloodGroup,
  recipientGroup: BloodGroup,
  component: BloodComponent = 'Whole Blood',
): boolean {
  return getCompatibleDonorGroups(recipientGroup, component).includes(donorGroup);
}

export function getCompatibilitySummary(
  recipientGroup: BloodGroup,
  component: BloodComponent = 'Whole Blood',
): string {
  const donors = getCompatibleDonorGroups(recipientGroup, component);
  if (component === 'Plasma') {
    return recipientGroup.startsWith('O')
      ? `${recipientGroup} plasma patients can receive plasma from any ABO group (${donors.join(', ')}).`
      : `For plasma, ${recipientGroup} accepts ${donors.join(', ')}.`;
  }
  if (recipientGroup === 'AB+') {
    return 'AB+ is the universal red-cell recipient and can match all 8 donor groups.';
  }
  if (recipientGroup === 'O-') {
    return 'O- patients can safely receive O- red cells only (universal emergency donor group).';
  }
  return `${recipientGroup} (${component}) can receive from: ${donors.join(', ')}. Always verified by blood bank cross-match.`;
}
