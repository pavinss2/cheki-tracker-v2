import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Read .env.local manually
const envPath = path.join(projectRoot, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const [key, val] = line.split("=");
  if (key && val) env[key.trim()] = val.trim();
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("🔥 Initializing Firebase for project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHEET_ID = "10Zr4KwYlrbHL2Gh2c1st5uw9Bxmj3h5aHjney5bqTPI";

const TAB_GIDS = {
  fact_cheki_transaction: "0",
  dim_member: "1704494832",
  dim_group: "41534320",
  dim_company: "1130115297",
  dim_color: "772471104",
  dim_type: "1764448531",
  dim_country: "1517609979"
};

// Robust CSV Parser handling quotes and commas
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const envPath = path.join(projectRoot, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const [key, val] = line.split("=");
  if (key && val) env[key.trim()] = val.trim();
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("🔥 Initializing Firebase for project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHEET_ID = "10Zr4KwYlrbHL2Gh2c1st5uw9Bxmj3h5aHjney5bqTPI";

const TAB_GIDS = {
  dim_member: "1704494832",
  dim_group: "41534320",
  dim_company: "1130115297",
  dim_color: "772471104",
  dim_type: "1764448531",
  dim_country: "1517609979",
  fact_cheki_transaction: "0"
};

// State-machine CSV parser that correctly handles multiline values in quotes (RFC-4180)
function parseCSVProper(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? '';
    });
    return obj;
  });

  return { headers, dataRows };
}

async function fetchTabCSV(colName, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  console.log(`⬇️ Fetching ${colName} (gid=${gid})...`);
  const res = await fetch(url);
  const text = await res.text();
  const parsed = parseCSVProper(text);
  console.log(`   ✓ Fetched ${parsed.dataRows.length} rows for ${colName}`);
  return parsed;
}

async function purgeCollection(colName) {
  console.log(`🧹 Purging existing documents in '${colName}'...`);
  const snapshot = await getDocs(collection(db, colName));
  if (snapshot.empty) return;

  const chunkSize = 400;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`   ✓ Purged ${snapshot.size} old documents from '${colName}'`);
}

async function seedCollection(colName, rows, userIds = ["n00MOBS446M0IZmIqVjlHQA52Cx2", "system"]) {
  if (!rows.length) return;
  console.log(`🚀 Uploading ${rows.length * userIds.length} docs to '${colName}'...`);
  const chunkSize = 400;

  const allDocsPayload = [];
  for (const uid of userIds) {
    for (const item of rows) {
      const now = new Date().toISOString();
      let payload = {
        userId: uid,
        createdAt: now,
        updatedAt: now,
      };

      if (colName === 'dim_member') {
        payload = {
          ...payload,
          member_name: item.member_name || '',
          member_image: (item.member_image === '#N/A' || item.member_image === 'N/A') ? '' : (item.member_image || ''),
          color: item.color || '',
          group: item.group || '',
          country: item.country || '',
          company: item.company || '',
          start_date: item.start_date || '',
          end_date: item.end_date || '',
          is_active: (item.is_active || '').toUpperCase() === 'TRUE',
          x_profile: (item.x_profile === '#N/A' || item.x_profile === 'N/A') ? '' : (item.x_profile || ''),
        };
      } else if (colName === 'dim_group') {
        payload = {
          ...payload,
          group: item.group || '',
          country: item.country || '',
          company: item.company || '',
        };
      } else if (colName === 'dim_company') {
        payload = {
          ...payload,
          company: item.company || '',
        };
      } else if (colName === 'dim_color') {
        payload = {
          ...payload,
          color: item.color || '',
          color_code: item.color_code || '#ffffff',
        };
      } else if (colName === 'dim_type') {
        payload = {
          ...payload,
          type: item.Type || item.type || '',
        };
      } else if (colName === 'dim_country') {
        payload = {
          ...payload,
          country: item.country || '',
          displayed_country: item.displayed_country || '',
        };
      } else if (colName === 'fact_cheki_transaction') {
        payload = {
          ...payload,
          member: item.Member || '',
          color: item.Color || '',
          group: item.Group || '',
          nationality: item.Nationality || '',
          date: item.Date || '',
          month: item.Date ? item.Date.substring(0, 7) : '',
          year: item.Date ? item.Date.substring(0, 4) : '',
          event: item.Event || '',
          type: item.Type || '',
          location: item.Location || '',
          quantity: Number(item.Quantity) || 1,
          totalPrice: Number(item['Total Price (THB)']) || 0,
          img: item.IMG || '',
          company: item.Company || '',
          talkTopic: item['Talk Topic'] || '',
        };
      }

      allDocsPayload.push(payload);
    }
  }

  for (let i = 0; i < allDocsPayload.length; i += chunkSize) {
    const chunk = allDocsPayload.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(p => {
      const docRef = doc(collection(db, colName));
      batch.set(docRef, p);
    });
    await batch.commit();
  }
}

async function main() {
  try {
    const fetchedData = {};
    for (const [colName, gid] of Object.entries(TAB_GIDS)) {
      fetchedData[colName] = await fetchTabCSV(colName, gid);
    }

    console.log("\n==================================================");
    console.log("REPLACING FIRESTORE COLLECTIONS WITH GOOGLE SHEET DATA");
    console.log("==================================================");

    for (const [colName, parsed] of Object.entries(fetchedData)) {
      await purgeCollection(colName);
      await seedCollection(colName, parsed.dataRows);
    }

    console.log("\n🎉 SUCCESS! All Firestore collections updated with 100% Google Sheet data!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error during sync:", err);
    process.exit(1);
  }
}

main();
