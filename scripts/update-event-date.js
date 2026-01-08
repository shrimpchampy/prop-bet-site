// One-time script to update event date to 2/5/2026 at 6:30pm
// Run this with: node scripts/update-event-date.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to download this from Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateEventDate() {
  try {
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();
    
    if (snapshot.empty) {
      console.log('No events found');
      return;
    }

    const newDate = new Date('2026-02-05T18:30:00');
    
    snapshot.forEach(async (doc) => {
      await doc.ref.update({
        eventDate: admin.firestore.Timestamp.fromDate(newDate)
      });
      console.log(`Updated event ${doc.id} date to ${newDate.toLocaleString()}`);
    });
    
    console.log('All events updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating events:', error);
    process.exit(1);
  }
}

updateEventDate();




