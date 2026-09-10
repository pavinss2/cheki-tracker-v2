import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const app = initializeApp({
  projectId: "cheki-tracker-39407",
});
const db = getFirestore(app);

// Read database_metadata.md to parse dimension data accurately
const metadataPath = path.join(projectRoot, "database_metadata.md");
const metadataText = fs.readFileSync(metadataPath, "utf8");

function parseMarkdownTable(text, sectionHeader) {
  const sectionStart = text.indexOf(sectionHeader);
  if (sectionStart === -1) return [];
  const afterSection = text.slice(sectionStart);
  const lines = afterSection.split("\n");
  const tableLines = [];
  let recording = false;
  for (const line of lines) {
    if (line.startsWith("|")) {
      recording = true;
      tableLines.push(line);
    } else if (recording && line.trim() === "") {
      break;
    }
  }
  if (tableLines.length < 3) return [];
  const headers = tableLines[0].split("|").map(h => h.trim()).filter(Boolean);
  const rows = [];
  for (let i = 2; i < tableLines.length; i++) {
    const cells = tableLines[i].split("|").map(c => c.trim()).slice(1, -1);
    if (cells.length === headers.length) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx];
      });
      rows.push(obj);
    }
  }
  return rows;
}

const dimMembers = parseMarkdownTable(metadataText, "## 1. dim_member");
const dimCompanies = parseMarkdownTable(metadataText, "## 2. dim_company");
const dimGroups = parseMarkdownTable(metadataText, "## 3. dim_group");
const dimColors = parseMarkdownTable(metadataText, "## 4. dim_color");
const dimTypes = parseMarkdownTable(metadataText, "## 5. dim_type");
const dimCountries = parseMarkdownTable(metadataText, "## 6. dim_country");
const factTransactions = parseMarkdownTable(metadataText, "## 7. fact_cheki_transaction");

console.log(`Parsed metadata:
- dim_member: ${dimMembers.length}
- dim_company: ${dimCompanies.length}
- dim_group: ${dimGroups.length}
- dim_color: ${dimColors.length}
- dim_type: ${dimTypes.length}
- dim_country: ${dimCountries.length}
- fact_cheki_transaction: ${factTransactions.length}`);

async function seedCollection(colName, items, userIdKey = "system") {
  if (!items.length) return;
  console.log(`\nSeeding collection '${colName}' with ${items.length} items...`);
  const chunkSize = 400;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((item) => {
      const docRef = db.collection(colName).doc();
      batch.set(docRef, {
        ...item,
        userId: userIdKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    console.log(`  ✓ Committed chunk ${Math.floor(i / chunkSize) + 1} for ${colName}`);
  }
}

async function main() {
  try {
    await seedCollection("dim_member", dimMembers);
    await seedCollection("dim_company", dimCompanies);
    await seedCollection("dim_group", dimGroups);
    await seedCollection("dim_color", dimColors);
    await seedCollection("dim_type", dimTypes);
    await seedCollection("dim_country", dimCountries);
    await seedCollection("fact_cheki_transaction", factTransactions);

    console.log("\n🎉 ALL 7 FIRESTORE COLLECTIONS SEEDED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Seeding error:", err);
    process.exit(1);
  }
}

main();
