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
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  function splitRow(rowStr) {
    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim().replace(/^"|"$/g, ''));
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim().replace(/^"|"$/g, ''));
    return cells;
  }

  const headers = splitRow(lines[0]);
  const dataRows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitRow(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    dataRows.push(obj);
  }

  return { headers, dataRows };
}

async function fetchTabCSV(colName, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  console.log(`⬇️ Fetching ${colName} (gid=${gid})...`);
  const res = await fetch(url);
  const text = await res.text();
  const parsed = parseCSV(text);
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

async function seedCollection(colName, rows, userIdKey = "system") {
  if (!rows.length) return;
  console.log(`🚀 Uploading ${rows.length} rows to '${colName}'...`);
  const chunkSize = 400;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const docRef = doc(collection(db, colName));
      // Type transformations
      const payload = {
        ...item,
        userId: userIdKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (item.Quantity) payload.quantity = Number(item.Quantity) || 1;
      if (item["Total Price (THB)"]) payload.totalPrice = Number(item["Total Price (THB)"]) || 0;
      if (item.Member) payload.member = item.Member;
      if (item.Color) payload.color = item.Color;
      if (item.Group) payload.group = item.Group;
      if (item.Nationality) payload.nationality = item.Nationality;
      if (item.Date) payload.date = item.Date;
      if (item.Month) payload.month = item.Month;
      if (item.Year) payload.year = item.Year;
      if (item.Event) payload.event = item.Event;
      if (item.Type) payload.type = item.Type;
      if (item.Location) payload.location = item.Location;
      if (item.IMG) payload.img = item.IMG;
      if (item.Company) payload.company = item.Company;
      if (item["Talk Topic"]) payload.talkTopic = item["Talk Topic"];

      batch.set(docRef, payload);
    });
    await batch.commit();
    console.log(`   ✓ Uploaded chunk ${Math.floor(i / chunkSize) + 1} for ${colName}`);
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
