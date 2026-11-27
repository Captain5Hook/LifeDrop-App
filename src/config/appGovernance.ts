/**
 * Single editable governance and review configuration.
 * Update grievance contact, reviewer name, review status, and reviewed date here before public launch.
 */
export const APP_GOVERNANCE_CONFIG = {
  grievanceContactLabel: 'Grievance contact: to be published before public launch',
  grievanceEmail: '',
  contentVersion: '1.0.0',
  reviewerName: 'Pending review',
  reviewStatus: 'Pending review',
  reviewedDate: 'Pending review',
  disclaimer: 'General guidance, not medical advice. Call 108 or 112 in an emergency.',
  getReviewLine(): string {
    return `Content follows standard first-aid guidance. Reviewed by: ${this.reviewerName}. Status: ${this.reviewStatus}.`;
  },
  getVersionAndReviewLine(): string {
    return `Content version: v${this.contentVersion} · Review date: ${this.reviewedDate}`;
  },
};
