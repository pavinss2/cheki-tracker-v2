import fs from "fs";

async function getSheetGids() {
  const url = "https://docs.google.com/spreadsheets/d/10Zr4KwYlrbHL2Gh2c1st5uw9Bxmj3h5aHjney5bqTPI/edit";
  const res = await fetch(url);
  const html = await res.text();

  // Search for sheetNames and sheetIds / gids in Google Sheet HTML bootstrap data
  const matches = [...html.matchAll(/\[\d+,\s*"([^"]+)",\s*(\d+)/g)];
  console.log("Found matches:");
  const sheets = [];
  matches.forEach(m => {
    sheets.push({ name: m[1], gid: m[2] });
  });

  console.log(JSON.stringify(sheets, null, 2));
}

getSheetGids();
