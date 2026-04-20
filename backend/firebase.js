const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'mryc-apps',
});

const db = admin.firestore();

module.exports = { admin, db };
