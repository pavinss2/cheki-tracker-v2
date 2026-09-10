import fs from "fs";

async function fetchTab0() {
  const url = "https://docs.google.com/spreadsheets/d/10Zr4KwYlrbHL2Gh2c1st5uw9Bxmj3h5aHjney5bqTPI/export?format=csv&gid=0";
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split("\n");
  console.log("gid=0 Total lines:", lines.length);
  console.log("Headers:", lines[0]);
  console.log("First 3 rows:");
  console.log(lines.slice(1, 4).join("\n"));
}

fetchTab0();
