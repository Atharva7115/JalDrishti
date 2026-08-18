/**
 * PHASE 2.5–2.7 COMPREHENSIVE AUDIT
 * Root-cause every unmapped station, discover missing AssessmentUnits,
 * compute achievable coverage.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_PATH = path.join(__dirname, "../data/india_taluk.geojson");

// ── Load GeoJSON ──────────────────────────────────────────────────────────────
console.log("[AUDIT] Loading GeoJSON...");
const raw = fs.readFileSync(GEOJSON_PATH, "utf-8");
const geojson = JSON.parse(raw);
const MH_FEATURES = geojson.features.filter(f => (f.properties?.NAME_1 || "") === "Maharashtra");
console.log(`[AUDIT] Loaded ${MH_FEATURES.length} Maharashtra taluka features\n`);

// ── Current alias map (from adminBoundaryResolver) ────────────────────────────
const TALUKA_ALIASES = {
  "ahmednagar": "Ahmadnagar", "ahmedanagar": "Ahmadnagar",
  "shirur": "SHIRUR", "yevla": "YEOLA", "yeola": "YEOLA",
  "niphad": "NIPHAD", "sinnar": "SINNAR", "dindori": "DINDORI",
  "baglan": "BAGLAN", "satana": "SATANA", "malegaon": "MALEGAON",
  "chandwad": "CHANDWAD", "deola": "DEOLA", "igatpuri": "IGATPURI",
  "peth": "PETH", "surgana": "SURGANA", "trimbakeshwar": "TRIMBAKESHWAR",
  "nandgaon": "NANDGAON", "kopargaon": "KOPARGAON", "rahata": "RAHATA",
  "nevasa": "NEVASA", "shrirampur": "SHRIRAMPUR", "rahuri": "RAHURI",
  "sangamner": "SANGAMNER", "akole": "AKOLE", "jamkhed": "JAMKHED",
  "parner": "PARNER", "shevgaon": "SHEVGAON", "pathardi": "PATHARDI",
  "karjat": "KARJAT", "osmanabad": "OSMANABAD", "tuljapur": "TULJAPUR",
  "latur": "LATUR", "ausa": "AUSA", "udgir": "UDGIR", "nilanga": "NILANGA",
  "chakur": "Chakur", "renapur": "RENAPUR", "deoni": "DEONI", "jalkot": "JALKOT",
  "madha": "MADHA", "solapur south": "SOLAPUR SOUTH", "solapur north": "SOLAPUR NORTH",
  "barshi": "BARSHI", "mangalvedha": "MANGALVEDHA", "pandharpur": "PANDHARPUR",
  "mohol": "MOHOL", "karmala": "KARMALA", "malshiras": "MALSHIRAS",
  "sangola": "SANGOLA", "akkalkot": "AKKALKOT",
  "amalner": "AMALNER", "jalgaon": "JALGAON", "bhusawal": "BHUSAWAL",
  "erandol": "ERANDOL", "chalisgaon": "CHALISGAON", "pachora": "PACHORA",
  "jamner": "JAMNER", "yawal": "YAWAL", "muktainagar": "MUKTAINAGAR",
  "raver": "RAVER", "parola": "PAROLA", "sangrampur": "SANGRAMPUR",
  "khamgaon": "KHAMGAON", "nandura": "NANDURA", "malkapur": "MALKAPUR",
  "motala": "MOTALA", "jalgaon jamod": "JALGAON JAMOD", "shegaon": "SHEGAON",
  "mehkar": "MEHKAR", "lonar": "LONAR", "deulgaon raja": "DEULGAON RAJA",
  "chikhli": "CHIKHLI", "phaltan": "PHALTAN", "satara": "SATARA",
  "karad": "KARAD", "koregaon": "KOREGAON", "wai": "WAI",
  "mahabaleshwar": "MAHABALESHWAR", "jawali": "JAWALI", "khandala": "KHANDALA",
  "patan": "PATAN", "man": "MAN", "khatav": "KHATAV", "khatan": "KHATAV",
  "nagpur": "NAGPUR (RURAL)", "nagpur rural": "NAGPUR (RURAL)",
  "hingna": "HINGNA", "kamptee": "KAMPTEE", "katol": "KATOL",
  "savner": "SAVNER", "narkhed": "NARKHED", "ramtek": "RAMTEK",
  "mouda": "MOUDA", "parseoni": "PARSEONI", "umred": "UMRED",
  "kuhi": "KUHI", "bhiwapur": "BHIWAPUR",
  "dhamangaon railway": "DHAMANGAON RAILWAY", "achalpur": "ACHALPUR",
  "chandur railway": "CHANDUR RAILWAY", "anjangaon surji": "ANJANGAON SURJI",
  "warud": "WARUD", "morshi": "MORSHI", "teosa": "TEOSA", "tiwsa": "TIWSA",
  "amravati": "AMRAVATI", "nandgaon khandeshwar": "NANDGAON KHANDESHWAR",
  "balapur": "BALAPUR", "chandrapur": "CHANDRAPUR", "mul": "MUL",
  "bhadravati": "BHADRAVATI", "warora": "WARORA", "sindewahi": "SINDEWAHI",
  "rajura": "RAJURA", "korpana": "KORPANA", "jiwati": "JIWATI",
  "gondpipri": "GONDPIPRI", "chimur": "CHIMUR", "pombhurna": "POMBHURNA",
  "ballarpur": "BALLARPUR", "brahmapuri": "BRAHMAPURI", "nagbhid": "NAGBHID",
  "bhandara": "BHANDARA", "tumsar": "TUMSAR", "mohadi": "MOHADI",
  "pauni": "PAUNI", "sakoli": "SAKOLI", "lakhandur": "LAKHANDUR", "lakhani": "LAKHANI",
  "umarga": "UMARGA", "kallam": "KALLAM", "paranda": "PARANDA", "washi": "WASHI",
  "ghansavangi": "Ghansavangi", "jalna": "JALNA", "badnapur": "BADNAPUR",
  "partur": "PARTUR", "mantha": "MANTHA", "bhokardan": "BHOKARDAN",
  "ambad": "AMBAD", "jafrabad": "JAFRABAD", "hingoli": "HINGOLI",
  "sengaon": "SENGAON", "kalamnuri": "KALAMNURI", "aundha nagnath": "AUNDHA (NAGNATH)",
  "basmath": "BASMATH", "nashik": "NASHIK", "raigad": "ALIBAG", "alibag": "ALIBAG",
  "shrivardhan": "SHRIVARDHAN", "mahad": "MAHAD", "poladpur": "POLADPUR",
  "mhasala": "MHASALA", "roha": "ROHA", "murud": "MURUD", "tala": "TALA",
  "pen": "PEN", "uran": "URAN", "khalapur": "KHALAPUR", "panvel": "PANVEL",
};

function norm(s) { return (s || "").trim().toLowerCase().replace(/\s+/g, " "); }

// GIS PIP lookup
function gisLookup(lat, lng) {
  const pt = turf.point([lng, lat]);
  for (const f of MH_FEATURES) {
    try {
      if (turf.booleanPointInPolygon(pt, f)) {
        return {
          district: (f.properties.NAME_2 || "").trim(),
          taluka: (f.properties.NAME_3 || "").trim(),
        };
      }
    } catch { continue; }
  }
  return null;
}

// ── GeoJSON unique talukas ─────────────────────────────────────────────────────
const geoJsonTalukas = new Map(); // "district|taluka" -> {district, taluka}
for (const f of MH_FEATURES) {
  const d = (f.properties.NAME_2 || "").trim();
  const t = (f.properties.NAME_3 || "").trim();
  if (t && !t.startsWith("n.a.")) geoJsonTalukas.set(`${norm(d)}|${norm(t)}`, { district: d, taluka: t });
}

async function main() {
  // ── Fetch all unmapped stations ───────────────────────────────────────────────
  const unmapped = await p.station.findMany({
    where: { assessmentUnitId: null },
    orderBy: [{ district: "asc" }, { stationName: "asc" }],
  });
  console.log(`\n[AUDIT] Unmapped stations: ${unmapped.length}\n`);

  // ── Fetch ALL AssessmentUnits ─────────────────────────────────────────────────
  const allAUs = await p.assessmentUnit.findMany();
  const auByKey = new Map(); // "district|taluka" -> AU
  for (const au of allAUs) {
    auByKey.set(`${norm(au.district)}|${norm(au.taluka)}`, au);
  }

  // ── Process each unmapped station ─────────────────────────────────────────────
  const results = [];
  const missingAUTalukas = new Map(); // "district|taluka" -> {district, taluka, stations:[]}
  const naStations = [];
  const outsidePolyStations = [];

  for (const s of unmapped) {
    const gis = gisLookup(s.latitude, s.longitude);
    let category, gisDistrict = null, gisTaluka = null, auExists = false;

    if (!gis) {
      category = "E_OUTSIDE_POLYGON";
      outsidePolyStations.push(s);
    } else {
      gisDistrict = gis.district;
      gisTaluka = gis.taluka;

      if (!gisTaluka || gisTaluka.startsWith("n.a.")) {
        category = "D_NA_GEOJSON";
        naStations.push({ ...s, gisDistrict, gisTaluka });
      } else {
        // Try exact match
        const exactKey = `${norm(gisDistrict)}|${norm(gisTaluka)}`;
        const aliasedTaluka = TALUKA_ALIASES[norm(gisTaluka)];
        const aliasKey = aliasedTaluka ? `${norm(gisDistrict)}|${norm(aliasedTaluka)}` : null;

        const exactMatch = auByKey.get(exactKey);
        const aliasMatch = aliasKey ? auByKey.get(aliasKey) : null;

        // Try district-insensitive AU search
        const auInDistrict = allAUs.filter(au => norm(au.district) === norm(gisDistrict));

        if (exactMatch || aliasMatch) {
          // This shouldn't happen (would already be mapped), but track it
          category = "X_SHOULD_BE_MAPPED";
          auExists = true;
        } else if (auInDistrict.length === 0) {
          category = "B_DISTRICT_NOT_IN_AU";
        } else {
          // District exists in AU, but this specific taluka doesn't
          category = "A_TALUKA_NOT_IN_AU";
          auExists = false;
          const mk = `${norm(gisDistrict)}|${norm(gisTaluka)}`;
          if (!missingAUTalukas.has(mk)) {
            missingAUTalukas.set(mk, { district: gisDistrict, taluka: gisTaluka, stations: [] });
          }
          missingAUTalukas.get(mk).stations.push(s.stationName);
        }
      }
    }

    results.push({
      stationId: s.id,
      stationName: s.stationName,
      district: s.district,
      tehsil: s.tehsil,
      block: s.block,
      village: s.village,
      lat: s.latitude,
      lng: s.longitude,
      gisDistrict,
      gisTaluka,
      auExists,
      category,
    });
  }

  // ── Section 1: Category Summary ───────────────────────────────────────────────
  const cats = {};
  for (const r of results) cats[r.category] = (cats[r.category] || 0) + 1;

  console.log("=== ROOT CAUSE CATEGORIES ===\n");
  const catDesc = {
    "A_TALUKA_NOT_IN_AU":      "Taluka GIS-detected correctly but missing from AssessmentUnit table",
    "B_DISTRICT_NOT_IN_AU":    "Entire district absent from AssessmentUnit table",
    "D_NA_GEOJSON":            "GeoJSON returns n.a. / empty taluka name for this polygon",
    "E_OUTSIDE_POLYGON":       "Station coordinates fall outside all Maharashtra GeoJSON polygons",
    "X_SHOULD_BE_MAPPED":      "Alias/exact match found — should already be mapped (bug)",
  };
  for (const [cat, cnt] of Object.entries(cats).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${cat.padEnd(28)} : ${cnt.toString().padStart(4)}  — ${catDesc[cat] || ""}`);
  }
  console.log();

  // ── Section 2: Missing AU Talukas ─────────────────────────────────────────────
  console.log("=== MISSING ASSESSMENTUNIT TALUKAS (Category A — fixable) ===\n");
  const missing = [...missingAUTalukas.values()].sort((a,b) => b.stations.length - a.stations.length);
  let totalImpacted = 0;
  console.log(`${"District".padEnd(22)} ${"Missing Taluka".padEnd(28)} ${"Stations Impacted"}`);
  console.log("-".repeat(75));
  for (const m of missing) {
    console.log(`${m.district.padEnd(22)} ${m.taluka.padEnd(28)} ${m.stations.length}`);
    totalImpacted += m.stations.length;
  }
  console.log("-".repeat(75));
  console.log(`TOTAL impact: ${totalImpacted} stations across ${missing.length} missing talukas\n`);

  // ── Section 3: n.a. stations detail ──────────────────────────────────────────
  console.log("=== n.a. GEOJSON STATIONS (Category D) ===\n");
  const naByDistrict = {};
  for (const s of naStations) {
    naByDistrict[s.district] = (naByDistrict[s.district] || 0) + 1;
  }
  for (const [d, cnt] of Object.entries(naByDistrict)) {
    console.log(`  ${d}: ${cnt}`);
  }
  console.log();

  // ── Section 4: Outside-polygon stations ──────────────────────────────────────
  console.log("=== OUTSIDE POLYGON STATIONS (Category E) ===\n");
  for (const s of outsidePolyStations) {
    console.log(`  ${s.stationName.padEnd(30)} District: ${s.district.padEnd(20)} Coords: (${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)})`);
  }
  console.log();

  // ── Section 5: GeoJSON vs AssessmentUnit taluka comparison ───────────────────
  console.log("=== GEOJSON TALUKAS NOT IN ASSESSMENTUNIT TABLE ===\n");
  const missingFromAU = [];
  for (const [key, { district, taluka }] of geoJsonTalukas) {
    const exactKey = `${norm(district)}|${norm(taluka)}`;
    const aliased = TALUKA_ALIASES[norm(taluka)];
    const aliasKey = aliased ? `${norm(district)}|${norm(aliased)}` : null;
    if (!auByKey.has(exactKey) && !(aliasKey && auByKey.has(aliasKey))) {
      missingFromAU.push({ district, taluka });
    }
  }
  missingFromAU.sort((a,b) => a.district.localeCompare(b.district) || a.taluka.localeCompare(b.taluka));
  console.log(`Total GeoJSON talukas with NO AssessmentUnit: ${missingFromAU.length}\n`);
  for (const m of missingFromAU) {
    console.log(`  ${m.district.padEnd(25)} | ${m.taluka}`);
  }
  console.log();

  // ── Section 6: Coverage estimate ─────────────────────────────────────────────
  const currentMapped = 1449 - unmapped.length;
  const gainFromAU = totalImpacted;
  const gainFromNaFallback = naStations.length; // Nearest-neighbour could cover these
  const gainFromOutside = 0; // Cannot be resolved without fixing source coordinates

  console.log("=== COVERAGE MAXIMIZATION ESTIMATE ===\n");
  console.log(`Current mapping:                     ${currentMapped} / 1449 (${((currentMapped/1449)*100).toFixed(1)}%)`);
  console.log(`After adding missing AUs:            ${currentMapped + gainFromAU} / 1449 (${(((currentMapped+gainFromAU)/1449)*100).toFixed(1)}%)`);
  console.log(`After spatial fallback for n.a.:     ${currentMapped + gainFromAU + gainFromNaFallback} / 1449 (${(((currentMapped+gainFromAU+gainFromNaFallback)/1449)*100).toFixed(1)}%)`);
  console.log(`Outside-polygon (unresolvable):      ${outsidePolyStations.length} stations`);
  console.log(`Maximum achievable coverage:         ${currentMapped + gainFromAU + gainFromNaFallback} / 1449 (${(((currentMapped+gainFromAU+gainFromNaFallback)/1449)*100).toFixed(1)}%)`);
  console.log();

  // ── Write JSON for implementation phase ──────────────────────────────────────
  const output = {
    summary: { total: 1449, mapped: currentMapped, unmapped: unmapped.length, categories: cats },
    missingTalukas: missing,
    naStations: naStations.map(s => ({ id: s.id, name: s.stationName, district: s.district, lat: s.latitude, lng: s.longitude })),
    outsidePolygon: outsidePolyStations.map(s => ({ id: s.id, name: s.stationName, district: s.district, lat: s.latitude, lng: s.longitude })),
    geoJsonNotInAU: missingFromAU,
  };
  fs.writeFileSync(path.join(__dirname, "audit_data.json"), JSON.stringify(output, null, 2));
  console.log("[AUDIT] Raw data written to audit_data.json");

  await p.$disconnect();
}

main().catch(async e => { console.error(e); await p.$disconnect(); });
