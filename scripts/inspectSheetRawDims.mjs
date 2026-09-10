const SHEET_ID = "10Zr4KwYlrbHL2Gh2c1st5uw9Bxmj3h5aHjney5bqTPI";

const TAB_GIDS = {
  dim_member: "1704494832",
  dim_group: "41534320",
  dim_company: "1130115297",
  dim_color: "772471104",
  dim_type: "1764448531",
  dim_country: "1517609979"
};

async function inspectDims() {
  for (const [name, gid] of Object.entries(TAB_GIDS)) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    console.log(`\n========================================`);
    console.log(`FETCHING ${name} (gid=${gid})`);
    console.log(`========================================`);
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.trim().split("\n");
    console.log(`Total CSV lines: ${lines.length}`);
    console.log(`Header: ${lines[0]}`);
    console.log(`First 5 rows:`);
    lines.slice(1, 6).forEach((line, i) => console.log(`  Row ${i + 1}: ${line}`));
  }
}

inspectDims();
