import fs from "fs";

const js = fs.readFileSync("scratch/script_26.js", "utf8");

// Search for patterns like ["dim_member", gid] or [gid, "dim_member"] or {"name":"dim_member","gid":...}
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
  const pos = js.indexOf(name);
  if (pos !== -1) {
    console.log(`\n=== Snippet around '${name}' ===`);
    console.log(js.substring(Math.max(0, pos - 150), Math.min(js.length, pos + 150)));
  }
});
