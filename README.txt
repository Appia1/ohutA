OHUT PIONEER REWARDS — INTERACTIVE SPINNER
1. Replace your existing rewards.html with this rewards.html.
2. The wheel is drawn in SVG/CSS from the prize options in JavaScript. No screenshot crop or wheel image is used.
3. Users can tap/click the wheel itself or press the Spin button.
4. The wheel animates to the server-confirmed prize. The existing Firebase callable functions are still required:
   - getPioneerRewardStatus
   - spinPioneerReward
5. Ensure the Cloud Functions and Firestore security rules are deployed before enabling real rewards.
6. Keep firebaseDetails.js in the same folder as rewards.html. If you use an OHT logo asset in the header, keep the asset path valid or replace the header image with your own logo path.
