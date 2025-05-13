import * as functions from 'firebase-functions';

export const testEmailFunction = functions.https.onRequest((req, res) => {
  res.send('✔️ Function deployed and working!');
});
