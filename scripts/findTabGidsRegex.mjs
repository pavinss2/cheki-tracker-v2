import fs from "fs";

const html = fs.readFileSync("scratch/sheet.html", "utf8");

// Search for any string snippet around docs-sheet-tab-caption
const regex = /<div[^>]*class="[^"]*docs-sheet-tab[^"]*"[^>]*>[\s\S]*?<\/div>/g;
const snippets = html.match(regex) || [];
console.log("Found tab snippets:", snippets.length);

snippets.forEach(snip => {
  const nameMatch = snip.match(/docs-sheet-tab-caption[^>]*>([^<]+)</);
  const gidMatch = snip.match(/id="sheet-button-(\d+)"/) || snip.match(/(\d{6,12})/);
  if (nameMatch) {
    console.log(`Name: ${nameMatch[1]}, GID Snippet:`, gidMatch ? gidMatch[0] : 'None');
  }
});
