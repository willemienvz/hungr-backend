import * as functions from 'firebase-functions';
import { createReview } from './createReview';
import { getReviews } from './getReviews';
import { updateReview } from './updateReview';
import { deleteReview } from './deleteReview';

// Export review functions
export const reviews = {
  createReview: functions.https.onCall(createReview),
  getReviews: functions.https.onCall(getReviews),
  updateReview: functions.https.onCall(updateReview),
  deleteReview: functions.https.onCall(deleteReview)
}; 