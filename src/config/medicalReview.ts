/**
 * Editable medical review attribution configuration.
 * Update contentVersion, reviewerName, and reviewedDate after formal medical review.
 */
export const MEDICAL_REVIEW_CONFIG = {
  contentVersion: '1.0.0',
  reviewerName: '[reviewer name, credential]',
  reviewedDate: 'Pending review',
  disclaimer: 'This is first-aid guidance, not a substitute for a doctor.',
  getReviewLine(): string {
    return `Content follows standard first-aid guidance. Reviewed by ${this.reviewerName}. Replace after review.`;
  },
  getVersionAndReviewLine(): string {
    return `Content version: v${this.contentVersion} · Review date: ${this.reviewedDate}`;
  },
};
