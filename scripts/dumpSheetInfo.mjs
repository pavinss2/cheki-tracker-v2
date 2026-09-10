import fs from "fs";

async function dumpSheetInfo() {
  const url = "https://docs.google.com/spreadsheets/d/10Zr4KwYlrbHL2Gh2c1st5uw9Bxmj3h5aHjney5bqTPI/edit";
  const res = await fetch(url);
  const html = await res.text();

  fs.mkdirSync("scratch", { recursive: true });
  fs.writeFileSync("scratch/sheet.html", html);

  // Find all tab names or gid occurrences in script tags
  const matches = [...html.matchAll(/\[(\d{8,11}),\s*"([^"]+)"/g)];
  console.log("Matches count:", matches.length);
  matches.forEach(m => console.log(`GID: ${m[1]}, Name: ${m[2]}`));
}

dumpSheetInfo();
