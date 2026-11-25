import compatibilityData from '../data/knowledge/compatibility.json';
import { ORDERED_BLOOD_GROUPS, type BloodGroup } from '../data/seedStats';

export type BloodComponent = 'Whole Blood' | 'PRBC' | 'Platelets' | 'Plasma';

export interface ComponentCompatibilitySpec {
  label: string;
  clinicalNote: string;
  compatibleDonorsByRecipient: Record<BloodGroup, BloodGroup[]>;
}

const COMPONENT_SPECS = compatibilityData.components as Record<
  BloodComponent,
  ComponentCompatibilitySpec
>;

export const COMPATIBILITY_KB_VERSION = compatibilityData.version;
export const COMPATIBILITY_DISCLAIMER = compatibilityData.disclaimer;

export function getComponentCompatibilitySpec(
  component: BloodComponent = 'Whole Blood',
): ComponentCompatibilitySpec {
  return COMPONENT_SPECS[component] ?? COMPONENT_SPECS['Whole Blood'];
}

export function getCompatibleDonorGroups(
  recipientGroup: BloodGroup,
  component: BloodComponent = 'Whole Blood',
): BloodGroup[] {
  const spec = getComponentCompatibilitySpec(component);
  return spec.compatibleDonorsByRecipient[recipientGroup] ?? [];
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
