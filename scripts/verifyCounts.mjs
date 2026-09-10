import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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
  "dim_country",
  "fact_cheki_transaction"
];

async function checkCollections() {
  console.log("Checking Firestore Collections status for project:", firebaseConfig.projectId);
  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    console.log(`  📁 Collection '${colName}': ${snap.size} documents found.`);
  }
  process.exit(0);
}

checkCollections();
