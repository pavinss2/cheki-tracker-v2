import fs from "fs";

const gidsToTest = [
  0,
  21299578,
  25813757,
  29921628,
  25104121,
  149980211,
  525000811,
  21350203,
  27809640,
  38362568,
  28950036,
  34070425,
  514397480,
  39390250,
  105059328
];

async function testAllGids() {
  for (const gid of gidsToTest) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/10Zr4KwYlrbHL2Gh2c1st5uw9Bxmj3h5aHjney5bqTPI/export?format=csv&gid=${gid}`;
      const res = await fetch(url);
      const text = await res.text();
      if (res.ok && text && !text.includes("<!DOCTYPE html>")) {
        const lines = text.trim().split("\n");
        console.log(`\n--- GID ${gid} (${lines.length} lines) ---`);
        console.log("Header:", lines[0]);
        console.log("Sample Row:", lines[1] || "(empty)");
      } else {
        // console.log(`GID ${gid} returned non-csv response.`);
      }
    } catch (err) {
      // console.error(`Error checking GID ${gid}:`, err.message);
    }
  }
}

testAllGids();
