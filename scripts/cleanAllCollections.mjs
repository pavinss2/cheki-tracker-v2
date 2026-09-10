import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch } from "firebase/firestore";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collections = [
  "dim_member",
  "dim_company",
  "dim_group",
  "dim_color",
  "dim_type",
  "dim_country"
];

async function cleanDimCollections() {
  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    const seen = new Set();
    const toDelete = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      let key = "";
      if (colName === "dim_member") key = (data.member_name || "").trim().toLowerCase();
      if (colName === "dim_company") key = (data.company || "").trim().toLowerCase();
      if (colName === "dim_group") key = (data.group || "").trim().toLowerCase();
      if (colName === "dim_color") key = (data.color || "").trim().toLowerCase();
      if (colName === "dim_type") key = (data.type || "").trim().toLowerCase();
      if (colName === "dim_country") key = (data.country || data.displayed_country || "").trim().toLowerCase();

      if (!key || seen.has(key)) {
        toDelete.push(docSnap.ref);
      } else {
        seen.add(key);
      }
    });

    if (toDelete.length > 0) {
      console.log(`Deduplicating/Cleaning '${colName}': removing ${toDelete.length} duplicates...`);
      const batch = writeBatch(db);
      toDelete.forEach(ref => batch.delete(ref));
      await batch.commit();
    }
  }

  console.log("\n📊 Current Clean Collection Counts:");
  const allCols = ["fact_cheki_transaction", ...collections];
  for (const c of allCols) {
    const s = await getDocs(collection(db, c));
    console.log(`  📁 '${c}': ${s.size} clean documents`);
  }

  process.exit(0);
}

cleanDimCollections();
