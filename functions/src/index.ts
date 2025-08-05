import * as functions from 'firebase-functions';
import { reviews } from './reviews';

export const testEmailFunction = functions.https.onRequest((req, res) => {
  res.send('✔️ Function deployed and working!');
});

// Export review functions
export const createReview = reviews.createReview;
export const getReviews = reviews.getReviews;
export const updateReview = reviews.updateReview;
export const deleteReview = reviews.deleteReview;
