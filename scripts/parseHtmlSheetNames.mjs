import fs from "fs";

const html = fs.readFileSync("scratch/sheet.html", "utf8");

// Search for sheet names in sheet data array structure in Google Sheets HTML
// Usually Google Sheets embeds sheet names like: [gid, "Sheet Name", ...]
const regex = /\[(\d{1,10}),\s*"([^"]+)",/g;
let match;
const sheets = [];
while ((match = regex.exec(html)) !== null) {
  sheets.push({ gid: match[1], name: match[2] });
}

console.log("Extracted sheets:");
console.log(sheets);
