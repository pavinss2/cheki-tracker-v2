import fs from "fs";

const html = fs.readFileSync("scratch/sheet.html", "utf8");

// Search for array pattern containing sheet names
const targetNames = [
  "fact_cheki_transaction",
  "dim_member",
  "dim_group",
  "dim_company",
  "dim_color",
  "dim_type",
  "dim_country"
];

targetNames.forEach(name => {
  const pos = html.indexOf(name);
  if (pos !== -1) {
    const snippet = html.substring(Math.max(0, pos - 200), Math.min(html.length, pos + 200));
    console.log(`\n=== Snippet around '${name}' ===`);
    console.log(snippet);
  }
});
