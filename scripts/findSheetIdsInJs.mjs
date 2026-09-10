import fs from "fs";

const html = fs.readFileSync("scratch/sheet.html", "utf8");

// Search for script tags and dump any JSON structure containing sheet names and IDs
const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
console.log(`Found ${scriptMatches.length} script tags.`);

scriptMatches.forEach((sm, i) => {
  const content = sm[1];
  if (content.includes("dim_member") || content.includes("fact_cheki_transaction")) {
    console.log(`\nScript #${i} contains sheet names! Length: ${content.length}`);
    // Save to scratch for analysis
    fs.writeFileSync(`scratch/script_${i}.js`, content);
  }
});
