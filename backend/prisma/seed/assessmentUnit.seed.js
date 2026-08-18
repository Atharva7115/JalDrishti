import fs from "fs";
import path from "path";

const DISTRICT_ALIASES = {
  "ahmednagar": "ahmadnagar",
  "buldhana": "buldana",
  "sindhudurg": "sindudurg",
  "yawatmal": "yavatmal",
};

const normalizeDistrict = (d) => {
  const norm = d.toLowerCase().trim();
  return DISTRICT_ALIASES[norm] || norm;
};

function parseCsv(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (values[i] ?? "").trim()));
    return row;
  });
}

export const seedAssessmentUnits = async (prisma) => {
  console.log("🌱 Harvesting unique Assessment Units from existing Stations and GSDA CSV...");

  const uniqueUnitsMap = new Map();

  // 1. Read from GSDA Matched Review CSV to seed canonical units
  let csvPath = path.resolve("gsda_matched_review.csv");
  if (!fs.existsSync(csvPath)) {
    csvPath = path.resolve("../ml-service/gsda_matched_review.csv");
  }

  if (fs.existsSync(csvPath)) {
    console.log(`📂 Reading canonical units from GSDA CSV: ${csvPath}`);
    const rows = parseCsv(fs.readFileSync(csvPath, "utf-8"));
    rows.forEach((row) => {
      // Determine district & taluka names to use
      const rawDistrict = row.district.trim();
      const mappedDistrict = DISTRICT_ALIASES[rawDistrict.toLowerCase()]
        ? DISTRICT_ALIASES[rawDistrict.toLowerCase()].toUpperCase()
        : rawDistrict;

      // If matched, use the database matched spelling; otherwise use raw CSV spelling
      const taluka = row.status === "matched" ? row.matched_taluka_in_db.trim() : row.taluka.trim();

      if (mappedDistrict && taluka && taluka !== "" && taluka !== "-") {
        const key = `maharashtra|${mappedDistrict}|${taluka}`.toLowerCase();
        if (!uniqueUnitsMap.has(key)) {
          // Normalize to Title Case or keep as mapped
          const displayDistrict = mappedDistrict.charAt(0).toUpperCase() + mappedDistrict.slice(1).toLowerCase();
          uniqueUnitsMap.set(key, {
            state: "Maharashtra",
            district: displayDistrict,
            taluka: taluka,
          });
        }
      }
    });
  } else {
    console.log("⚠️  GSDA CSV not found for harvesting units. Relying solely on stations.");
  }

  // 2. Fallback: Harvest from existing Stations
  const stations = await prisma.station.findMany({
    select: {
      state: true,
      district: true,
      block: true,
      tehsil: true,
    },
  });

  const getTaluka = (station) => {
    if (
      station.block &&
      station.block !== "null" &&
      station.block.trim() !== "" &&
      station.block.trim() !== "-"
    ) {
      return station.block.trim();
    }
    if (
      station.tehsil &&
      station.tehsil !== "null" &&
      station.tehsil.trim() !== "" &&
      station.tehsil.trim() !== "-"
    ) {
      return station.tehsil.trim();
    }
    return null;
  };

  for (const station of stations) {
    if (!station.state || !station.district) {
      continue;
    }

    const state = station.state.trim();
    const district = station.district.trim();
    const taluka = getTaluka(station);

    if (!taluka || state === "-" || district === "-") {
      continue;
    }

    const key = `${state}|${district}|${taluka}`.toLowerCase();
    if (!uniqueUnitsMap.has(key)) {
      uniqueUnitsMap.set(key, {
        state,
        district,
        taluka,
      });
    }
  }

  const uniqueUnits = Array.from(uniqueUnitsMap.values());
  console.log(`📌 Found ${uniqueUnits.length} unique Assessment Units total.`);

  let createdCount = 0;
  for (const unit of uniqueUnits) {
    await prisma.assessmentUnit.upsert({
      where: {
        state_district_taluka: {
          state: unit.state,
          district: unit.district,
          taluka: unit.taluka,
        },
      },
      update: {},
      create: unit,
    });
    createdCount++;
  }

  console.log(`✅ Successfully seeded/upserted ${createdCount} Assessment Units.`);
};

