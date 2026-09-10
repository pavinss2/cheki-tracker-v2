import fs from "fs";

const html = fs.readFileSync("scratch/sheet.html", "utf8");

// Extract tab names from docs-sheet-tab-caption or sheet tabs
const matches = [...html.matchAll(/docs-sheet-tab-caption[^>]*>([^<]+)</g)];
console.log("Tab names found:");
matches.forEach((m, idx) => console.log(`${idx + 1}: ${m[1]}`));
