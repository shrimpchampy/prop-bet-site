// Import a Google Sheets CSV into Firestore as an event + questions + submissions.
// Usage:
//   node scripts/import-google-sheet.js --csv "/path/to/file.csv" --eventName "Super Bowl 2025 (Imported)" --eventDate "2025-02-09T18:30:00"
// Optional:
//   --eventId "<existingEventId>"  (skip creating event)
//   --eventDescription "..."
//   --dryRun
//
// Requires: serviceAccountKey.json in project root (download from Firebase Admin SDK).

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Missing serviceAccountKey.json in project root.');
  console.error('Download it from Firebase Console > Project Settings > Service Accounts.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

const META_HEADERS = new Set([
  'Timestamp',
  'Email Address',
  "What's your name?",
  'Column 1',
  'Column 2',
  'Column 3',
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function parseCSV(content) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        value += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(value);
        value = '';
      } else if (char === '\n') {
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
      } else if (char === '\r') {
        // Ignore CR
      } else {
        value += char;
      }
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function parseTimestamp(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!isNaN(direct.getTime())) return direct;

  // Fallback for M/D/YYYY HH:MM:SS
  const match = String(value).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) return null;
  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  const second = parseInt(match[6] || '0', 10);
  const parsed = new Date(year, month, day, hour, minute, second);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function splitName(fullName) {
  const cleaned = String(fullName || '').trim();
  if (!cleaned) {
    return { firstName: '', lastName: '' };
  }
  const parts = cleaned.split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

function buildUsername(name, email) {
  const cleaned = String(name || '').trim();
  if (cleaned) return cleaned;
  const emailStr = String(email || '').trim();
  if (emailStr.includes('@')) return emailStr.split('@')[0];
  return 'Unknown';
}

async function importSheet() {
  const args = parseArgs();
  const csvPath = args.csv;
  if (!csvPath) {
    console.error('Missing --csv "/path/to/file.csv"');
    process.exit(1);
  }

  const eventIdArg = args.eventId;
  const eventName = args.eventName || 'Super Bowl 2025 (Imported)';
  const eventDescription = args.eventDescription || 'Imported from Google Sheets CSV';
  const eventDateValue = args.eventDate || null;
  const dryRun = !!args.dryRun;

  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(content);
  if (!rows.length) {
    console.error('CSV appears empty.');
    process.exit(1);
  }

  const headers = rows[0].map(h => String(h || '').trim());
  const headerIndex = Object.fromEntries(headers.map((h, idx) => [h, idx]));

  const timestampIndex = headerIndex['Timestamp'];
  const emailIndex = headerIndex['Email Address'];
  const nameIndex = headerIndex["What's your name?"];

  const questionColumns = headers
    .map((h, idx) => ({ header: h, index: idx }))
    .filter(item => item.header && !META_HEADERS.has(item.header));

  if (questionColumns.length === 0) {
    console.error('No question columns found. Check header names.');
    process.exit(1);
  }

  console.log(`Found ${questionColumns.length} question columns.`);
  console.log(`Found ${rows.length - 1} response rows.`);

  let eventId = eventIdArg;
  if (!eventId) {
    const eventDate = eventDateValue ? new Date(eventDateValue) : new Date();
    const eventRef = db.collection('events').doc();
    eventId = eventRef.id;

    if (!dryRun) {
      await eventRef.set({
        name: eventName,
        description: eventDescription,
        eventDate: admin.firestore.Timestamp.fromDate(eventDate),
        isActive: true,
        isLocked: false,
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
        createdBy: 'import-script',
      });
    }
    console.log(`Created event: ${eventId} (${eventName})`);
  } else {
    console.log(`Using existing event: ${eventId}`);
  }

  // Create questions
  const questionIds = [];
  if (!dryRun) {
    const batch = db.batch();
    questionColumns.forEach((col, idx) => {
      const qRef = db.collection('questions').doc();
      questionIds.push(qRef.id);
      batch.set(qRef, {
        eventId,
        question: col.header,
        type: 'text',
        order: idx,
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      });
    });
    await batch.commit();
  } else {
    questionColumns.forEach(() => questionIds.push(`dry_${Math.random().toString(36).slice(2)}`));
  }

  console.log(`Created ${questionIds.length} questions.`);

  // Create submissions in batches of 400
  let totalSubmissions = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(cell => String(cell || '').trim() === '')) {
      continue;
    }

    const timestampValue = timestampIndex !== undefined ? row[timestampIndex] : '';
    const emailValue = emailIndex !== undefined ? row[emailIndex] : '';
    const nameValue = nameIndex !== undefined ? row[nameIndex] : '';
    const { firstName, lastName } = splitName(nameValue);
    const username = buildUsername(nameValue, emailValue);
    const submittedAt = parseTimestamp(timestampValue) || new Date();

    const picks = [];
    questionColumns.forEach((col, idx) => {
      const answer = String(row[col.index] || '').trim();
      if (answer) {
        picks.push({
          propId: questionIds[idx],
          answer,
        });
      }
    });

    const submissionRef = db.collection('submissions').doc();
    if (!dryRun) {
      batch.set(submissionRef, {
        eventId,
        username,
        firstName,
        lastName,
        email: String(emailValue || '').trim(),
        picks,
        submittedAt: admin.firestore.Timestamp.fromDate(submittedAt),
      });
    }

    totalSubmissions++;
    batchCount++;

    if (batchCount >= 400 && !dryRun) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0 && !dryRun) {
    await batch.commit();
  }

  console.log(`Imported ${totalSubmissions} submissions.`);
  console.log('Done.');
}

importSheet().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
