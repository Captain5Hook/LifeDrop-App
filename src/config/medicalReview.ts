/**
 * Editable medical review attribution configuration.
 * Update reviewerName, reviewerCredential, and reviewedDate after formal medical review.
 */
export const MEDICAL_REVIEW_CONFIG = {
  reviewerName: '[reviewer name, credential]',
  reviewedDate: 'Pending review',
  disclaimer: 'This is first-aid guidance, not a substitute for a doctor.',
  getReviewLine(): string {
    return `Content follows standard first-aid guidance. Reviewed by ${this.reviewerName}. Replace after review.`;
  },
};
