import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const app = initializeApp({
  projectId: "cheki-tracker-39407",
});
const db = getFirestore(app);
const auth = getAuth(app);

const OWNER_EMAIL = "pavin.ss2@gmail.com";

async function cleanup() {
  console.log(`🔍 Looking up UID for owner email: ${OWNER_EMAIL}...`);
  let ownerUid = null;
  try {
    const ownerUser = await auth.getUserByEmail(OWNER_EMAIL);
    ownerUid = ownerUser.uid;
    console.log(`✅ Owner UID found: ${ownerUid}`);
  } catch (err) {
    console.warn(`⚠️ Could not fetch owner UID via Auth:`, err.message);
  }

  console.log("🔍 Fetching all transactions in Firestore collection `fact_cheki_transaction`...");
  const snap = await db.collection("fact_cheki_transaction").get();
  console.log(`Found total ${snap.size} transaction documents in Firestore.`);

  let deletedCount = 0;
  let keptCount = 0;
  const batchSize = 400;
  let currentBatch = db.batch();
  let operationCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const docUserId = data.userId;

    // Keep doc ONLY if docUserId matches ownerUid
    const isOwnerDoc = ownerUid && docUserId === ownerUid;

    if (!isOwnerDoc) {
      currentBatch.delete(doc.ref);
      deletedCount++;
      operationCount++;
      if (operationCount >= batchSize) {
        await currentBatch.commit();
        currentBatch = db.batch();
        operationCount = 0;
      }
    } else {
      keptCount++;
    }
  }

  if (operationCount > 0) {
    await currentBatch.commit();
  }

  console.log(`\n🎉 Cleanup Summary:`);
  console.log(`- Total deleted non-owner transactions: ${deletedCount}`);
  console.log(`- Total kept owner transactions: ${keptCount}`);
}

cleanup().catch(console.error);
