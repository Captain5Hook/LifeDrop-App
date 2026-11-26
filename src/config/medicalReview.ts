/**
 * Editable medical review attribution configuration.
 * Update contentVersion, reviewerName, and reviewedDate after formal medical review.
 */
export const MEDICAL_REVIEW_CONFIG = {
  contentVersion: '1.0.0',
  reviewerLabel: '[reviewer name, credential]',
  reviewStatus: 'Pending review',
  reviewedDate: 'Pending review',
  disclaimer: 'General guidance, not medical advice. Call 108 or 112 in an emergency.',
  getReviewLine(): string {
    return `Content follows standard first-aid guidance. Reviewed by ${this.reviewerLabel}. Status: ${this.reviewStatus}.`;
  },
  getVersionAndReviewLine(): string {
    return `Content version: v${this.contentVersion} · Review date: ${this.reviewedDate}`;
  },
};
