import fs from "fs";

async function inspectHtml() {
  const url = "https://docs.google.com/spreadsheets/d/10Zr4KwYlrbHL2Gh2c1st5uw9Bxmj3h5aHjney5bqTPI/edit";
  const res = await fetch(url);
  const html = await res.text();

  // Search for sheet name pattern or bootstrap data
  const gridMatch = html.match(/DOC_DATA\s*=\s*(.+?);/);
  if (gridMatch) {
    console.log("Found DOC_DATA length:", gridMatch[1].length);
  }

  // Search for "sheetId" or "name" in JSON stringified blobs
  const gids = [...html.matchAll(/"gid":\s*"?(\d+)"?/g)].map(m => m[1]);
  const sheetNames = [...html.matchAll(/"name":\s*"([^"]+)"/g)].map(m => m[1]);

  console.log("Unique GIDs:", [...new Set(gids)]);
  console.log("Sample Names:", [...new Set(sheetNames)].slice(0, 30));
}

inspectHtml();
