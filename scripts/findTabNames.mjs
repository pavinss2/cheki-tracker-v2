import fs from "fs";

const html = fs.readFileSync("scratch/sheet.html", "utf8");

// Search for tab names or sheet data in html
const matches = [...html.matchAll(/"([^"]*?(?:dim_|member|group|color|country|company|fact_|sheet)[^"]*?)"/gi)];
const uniqueStrings = new Set();
matches.forEach(m => {
  if (m[1].length < 60) uniqueStrings.add(m[1]);
});

console.log("Found strings:");
console.log([...uniqueStrings].slice(0, 50));
