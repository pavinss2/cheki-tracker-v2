import fs from "fs";

const html = fs.readFileSync("scratch/sheet.html", "utf8");

// Search for tab names and their associated gid in Google Sheets HTML
// Tab elements have structure with id="sheet-button-<gid>" or data-sheet-id="<gid>" or similar
const tabRegex = /id="sheet-button-(\d+)"[^>]*>[\s\S]*?docs-sheet-tab-caption[^>]*>([^<]+)</g;

let match;
const tabMap = {};
while ((match = tabRegex.exec(html)) !== null) {
  tabMap[match[2].trim()] = match[1];
}

console.log("Mapped Tabs to GIDs:");
console.log(tabMap);
