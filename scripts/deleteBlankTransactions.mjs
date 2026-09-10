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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteBlankRows() {
  console.log("Checking 'fact_cheki_transaction' in Firestore project:", firebaseConfig.projectId);
  const snapshot = await getDocs(collection(db, "fact_cheki_transaction"));
  console.log(`Total documents in 'fact_cheki_transaction': ${snapshot.size}`);

  const docsToDelete = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const memberVal = (data.member || data.Member || "").toString().trim();
    const dateVal = (data.date || data.Date || "").toString().trim();

    // Check if both Member AND Date are blank
    if (!memberVal && !dateVal) {
      docsToDelete.push({ id: docSnap.id, ref: docSnap.ref });
    }
  });

  console.log(`Found ${docsToDelete.length} documents with blank Member AND Date.`);

  if (docsToDelete.length > 0) {
    const chunkSize = 400;
    for (let i = 0; i < docsToDelete.length; i += chunkSize) {
      const chunk = docsToDelete.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(item => batch.delete(item.ref));
      await batch.commit();
      console.log(`  ✓ Deleted batch ${Math.floor(i / chunkSize) + 1} (${chunk.length} docs)`);
    }
  }

  const newSnapshot = await getDocs(collection(db, "fact_cheki_transaction"));
  console.log(`\n✅ Clean up complete! Remaining valid documents in 'fact_cheki_transaction': ${newSnapshot.size}`);
  process.exit(0);
}

deleteBlankRows();
