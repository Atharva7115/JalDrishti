/**
 * adminBoundaryResolver.service.js
 *
 * Resolves AssessmentUnit for a station using:
 *   latitude + longitude
 *       ↓
 *   Point-in-Polygon against Maharashtra taluka boundaries (india_taluk.geojson)
 *       ↓
 *   Taluka name normalization + alias mapping
 *       ↓
 *   AssessmentUnit lookup (state + district + taluka)
 *
 * Resolution priority:
 *   1. Existing tehsil (skip if already present)
 *   2. Existing block (skip if already present)
 *   3. GIS Point-in-Polygon using authoritative taluka boundaries
 *   4. Alias normalization to match NWDP/GIS names to AssessmentUnit DB names
 *   5. Nearest-neighbour FALLBACK only (>0 mapped stations in same district)
 *
 * The service is idempotent — it never overwrites a valid existing assessmentUnitId.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";
import prisma from "../config/database.js";

// ─── GeoJSON Boundary Loading ─────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_PATH = path.join(__dirname, "../data/india_taluk.geojson");

let _talukaFeatures = null; // lazy-loaded cache

function loadTalukaFeatures() {
  if (_talukaFeatures) return _talukaFeatures;
  console.log("[GeoResolver] Loading Maharashtra taluka boundary data...");
  const raw = fs.readFileSync(GEOJSON_PATH, "utf-8");
  const geojson = JSON.parse(raw);
  // Filter to Maharashtra only for performance — GADM uses NAME_1 for state
  _talukaFeatures = geojson.features.filter((f) => {
    const props = f.properties || {};
    return (props.NAME_1 || "") === "Maharashtra";
  });
  console.log(`[GeoResolver] Loaded ${_talukaFeatures.length} Maharashtra taluka features.`);
  return _talukaFeatures;
}

// ─── Alias Maps ────────────────────────────────────────────────────────────────
// Maps GIS/NWDP taluka name variants → canonical AssessmentUnit taluka name
// Keys are lowercase normalized. Values match exactly as stored in AssessmentUnit.taluka.
const TALUKA_ALIASES = {
  "ahmednagar":      "Ahmadnagar",
  "ahmedanagar":     "Ahmadnagar",
  "shirur":          "SHIRUR",
  "yevla":           "YEOLA",
  "yeola":           "YEOLA",
  "kalyan":          "KALYAN",
  "ulhasnagar":      "ULHASNAGAR",
  "niphad":          "NIPHAD",
  "sinnar":          "SINNAR",
  "dindori":         "DINDORI",
  "baglan":          "BAGLAN",
  "satana":          "SATANA",
  "malegaon":        "MALEGAON",
  "chandwad":        "CHANDWAD",
  "deola":           "DEOLA",
  "igatpuri":        "IGATPURI",
  "peth":            "PETH",
  "surgana":         "SURGANA",
  "trimbakeshwar":   "TRIMBAKESHWAR",
  "nandgaon":        "NANDGAON",
  "kopargaon":       "KOPARGAON",
  "rahata":          "RAHATA",
  "nevasa":          "NEVASA",
  "shrirampur":      "SHRIRAMPUR",
  "rahuri":          "RAHURI",
  "sangamner":       "SANGAMNER",
  "akole":           "AKOLE",
  "jamkhed":         "JAMKHED",
  "parner":          "PARNER",
  "shevgaon":        "SHEVGAON",
  "pathardi":        "PATHARDI",
  "karjat":          "KARJAT",
  "osmanabad":       "OSMANABAD",
  "tuljapur":        "TULJAPUR",
  "latur":           "LATUR",
  "ausa":            "AUSA",
  "udgir":           "UDGIR",
  "nilanga":         "NILANGA",
  "chakur":          "Chakur",
  "renapur":         "RENAPUR",
  "shirur anantpal": "SHIRUR-ANANTPAL",
  "deoni":           "DEONI",
  "jalkot":          "JALKOT",
  "madha":           "MADHA",
  "solapur south":   "SOLAPUR SOUTH",
  "solapur north":   "SOLAPUR NORTH",
  "barshi":          "BARSHI",
  "mangalvedha":     "MANGALVEDHA",
  "pandharpur":      "PANDHARPUR",
  "mohol":           "MOHOL",
  "karmala":         "KARMALA",
  "malshiras":       "MALSHIRAS",
  "sangola":         "SANGOLA",
  "akkalkot":        "AKKALKOT",
  "north solapur":   "SOLAPUR NORTH",
  "south solapur":   "SOLAPUR SOUTH",
  "amalner":         "AMALNER",
  "jalgaon":         "JALGAON",
  "bhusawal":        "BHUSAWAL",
  "bodwad":          "BODWAD",
  "dharangaon":      "DHARANGAON",
  "erandol":         "ERANDOL",
  "chalisgaon":      "CHALISGAON",
  "pachora":         "PACHORA",
  "jamner":          "JAMNER",
  "yawal":           "YAWAL",
  "muktainagar":     "MUKTAINAGAR",
  "raver":           "RAVER",
  "parola":          "PAROLA",
  "sangrampur":      "SANGRAMPUR",
  "khamgaon":        "KHAMGAON",
  "nandura":         "NANDURA",
  "malkapur":        "MALKAPUR",
  "motala":          "MOTALA",
  "jalgaon jamod":   "JALGAON JAMOD",
  "shegaon":         "SHEGAON",
  "mehkar":          "MEHKAR",
  "lonar":           "LONAR",
  "deulgaon raja":   "DEULGAON RAJA",
  "chikhli":         "CHIKHLI",
  "phaltan":         "PHALTAN",
  "satara":          "SATARA",
  "karad":           "KARAD",
  "koregaon":        "KOREGAON",
  "wai":             "WAI",
  "mahabaleshwar":   "MAHABALESHWAR",
  "jawali":          "JAWALI",
  "khandala":        "KHANDALA",
  "patan":           "PATAN",
  "man":             "MAN",
  "khatan":          "KHATAV",
  "khatav":          "KHATAV",
  "nagpur":          "NAGPUR (RURAL)",
  "nagpur rural":    "NAGPUR (RURAL)",
  "hingna":          "HINGNA",
  "kamptee":         "KAMPTEE",
  "katol":           "KATOL",
  "savner":          "SAVNER",
  "narkhed":         "NARKHED",
  "ramtek":          "RAMTEK",
  "mouda":           "MOUDA",
  "parseoni":        "PARSEONI",
  "umred":           "UMRED",
  "kuhi":            "KUHI",
  "bhiwapur":        "BHIWAPUR",
  "dhamangaon railway": "DHAMANGAON RAILWAY",
  "achalpur":        "ACHALPUR",
  "chandur railway": "CHANDUR RAILWAY",
  "anjangaon surji": "ANJANGAON SURJI",
  "warud":           "WARUD",
  "morshi":          "MORSHI",
  "teosa":           "TEOSA",
  "tiwsa":           "TIWSA",
  "amravati":        "AMRAVATI",
  "nandgaon khandeshwar": "NANDGAON KHANDESHWAR",
  "balapur":         "BALAPUR",
  "chandrapur":      "CHANDRAPUR",
  "mul":             "MUL",
  "bhadravati":      "BHADRAVATI",
  "warora":          "WARORA",
  "sindewahi":       "SINDEWAHI",
  "rajura":          "RAJURA",
  "korpana":         "KORPANA",
  "jiwati":          "JIWATI",
  "gondpipri":       "GONDPIPRI",
  "chimur":          "CHIMUR",
  "pombhurna":       "POMBHURNA",
  "ballarpur":       "BALLARPUR",
  "brahmapuri":      "BRAHMAPURI",
  "nagbhid":         "NAGBHID",
  "bhandara":        "BHANDARA",
  "tumsar":          "TUMSAR",
  "mohadi":          "MOHADI",
  "pauni":           "PAUNI",
  "sakoli":          "SAKOLI",
  "lakhandur":       "LAKHANDUR",
  "lakhani":         "LAKHANI",
  "umarga":          "UMARGA",
  "kalambhir":       "KALLAM",
  "kallam":          "KALLAM",
  "paranda":         "PARANDA",
  "washi":           "WASHI",
  "yeola":           "YEOLA",
  "niphad":          "NIPHAD",
  "ghansavangi":     "Ghansavangi",
  "jalna":           "JALNA",
  "badnapur":        "BADNAPUR",
  "partur":          "PARTUR",
  "mantha":          "MANTHA",
  "bhokardan":       "BHOKARDAN",
  "ambad":           "AMBAD",
  "jafrabad":        "JAFRABAD",
  "hingoli":         "HINGOLI",
  "sengaon":         "SENGAON",
  "kalamnuri":       "KALAMNURI",
  "aundha nagnath":  "AUNDHA (NAGNATH)",
  "basmath":         "BASMATH",
  "nashik":          "NASHIK",
  "raigad":          "ALIBAG",
  "alibag":          "ALIBAG",
  "shrivardhan":     "SHRIVARDHAN",
  "mahad":           "MAHAD",
  "poladpur":        "POLADPUR",
  "mhasala":         "MHASALA",
  "roha":            "ROHA",
  "murud":           "MURUD",
  "tala":            "TALA",
  "karjat (raigad)": "KARJAT",
  "pen":             "PEN",
  "uran":            "URAN",
  "khalapur":        "KHALAPUR",
  "panvel":          "PANVEL",
  "shirur-kasar":    "SHIRUR KA",
  "shirur-anantpal": "ANANTPAL SH",
  "desaiganj":       "WADSA",
  "bavda":           "GAGANBAWADA",
  "parseoni":        "Parsivni",
  "edlabad":         "Edalabad",
  "kavathe-mahankal": "Kavathe Mahankal",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function normalize(str) {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Taluka → AssessmentUnit DB Lookup ────────────────────────────────────────
async function findAssessmentUnit(state, district, rawTaluka) {
  const normalizedTaluka = normalize(rawTaluka);
  let lookupDistrict = district;
  if (normalize(district) === "thane" && normalizedTaluka === "vikramgad") {
    lookupDistrict = "Palghar";
  }

  // Fetch all units in this district (case-insensitive)
  const candidates = await prisma.assessmentUnit.findMany({
    where: {
      state: { equals: state, mode: "insensitive" },
      district: { equals: lookupDistrict, mode: "insensitive" },
    },
  });

  if (candidates.length === 0) return null;

  // 1. Exact normalized match
  const exact = candidates.find(
    (u) => normalize(u.taluka) === normalizedTaluka
  );
  if (exact) return { unit: exact, matchType: "EXACT" };

  // 2. Alias lookup
  const aliased = TALUKA_ALIASES[normalizedTaluka];
  if (aliased) {
    const aliasMatch = candidates.find(
      (u) => normalize(u.taluka) === normalize(aliased)
    );
    if (aliasMatch) return { unit: aliasMatch, matchType: "ALIAS" };
  }

  // 3. Substring / startsWith match
  const partial = candidates.find(
    (u) =>
      normalize(u.taluka).startsWith(normalizedTaluka) ||
      normalizedTaluka.startsWith(normalize(u.taluka))
  );
  if (partial) return { unit: partial, matchType: "PARTIAL" };

  return null;
}

// ─── Primary: GIS Point-in-Polygon ────────────────────────────────────────────
async function resolveViaGIS(station) {
  const features = loadTalukaFeatures();
  const pt = turf.point([station.longitude, station.latitude]);

  for (const feature of features) {
    try {
      if (turf.booleanPointInPolygon(pt, feature)) {
        const props = feature.properties || {};
        // GADM property naming: NAME_1=State, NAME_2=District, NAME_3=Taluka
        const gisDistrict = (props.NAME_2 || "").trim();
        const gisTaluka   = (props.NAME_3 || "").trim();

        if (!gisTaluka || gisTaluka.toLowerCase().startsWith("n.a.")) continue;

        return {
          gisDistrict,
          gisTaluka,
          method: "GIS_PIP",
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Fallback: Nearest Mapped Neighbour (same district, ≤15 km) ───────────────
async function resolveViaSpatialFallback(station, mappedStations) {
  const sameDistrict = mappedStations.filter(
    (m) => normalize(m.district) === normalize(station.district)
  );
  let nearest = null;
  let minDist = Infinity;
  for (const m of sameDistrict) {
    const d = getDistanceKm(
      station.latitude,
      station.longitude,
      m.latitude,
      m.longitude
    );
    if (d < minDist) {
      minDist = d;
      nearest = m;
    }
  }
  if (!nearest || minDist > 15) return null;
  return {
    taluka: nearest.assessmentUnit?.taluka,
    assessmentUnitId: nearest.assessmentUnitId,
    distanceKm: minDist.toFixed(2),
    method: "SPATIAL_FALLBACK",
    confidence: minDist <= 5 ? "HIGH" : "MEDIUM",
  };
}

// ─── Main Export: Resolve a Single Station ────────────────────────────────────
export async function resolveStationAssessmentUnit(station, mappedStations = []) {
  const prefix = `[GeoResolver] Station "${station.stationName}"`;

  // Guard: already mapped
  if (station.assessmentUnitId) {
    console.log(`${prefix} → already mapped. Skipping.`);
    return { station, resolved: false, reason: "ALREADY_MAPPED" };
  }

  let taluka = null;
  let method = null;
  let gisDistrict = station.district;
  let confidence = null;

  // ── Tier 1: Existing tehsil ──────────────────────────────────────────────
  const hasTehsil =
    station.tehsil &&
    station.tehsil.trim() !== "" &&
    station.tehsil !== "null" &&
    station.tehsil !== "-";
  if (hasTehsil) {
    taluka = station.tehsil;
    method = "EXISTING_TEHSIL";
    confidence = "HIGH";
  }

  // ── Tier 2: Existing block ───────────────────────────────────────────────
  if (!taluka) {
    const hasBlock =
      station.block &&
      station.block.trim() !== "" &&
      station.block !== "null" &&
      station.block !== "-";
    if (hasBlock) {
      taluka = station.block;
      method = "EXISTING_BLOCK";
      confidence = "HIGH";
    }
  }

  // ── Tier 3: GIS Point-in-Polygon ─────────────────────────────────────────
  if (!taluka) {
    const gisResult = await resolveViaGIS(station);
    if (gisResult) {
      taluka = gisResult.gisTaluka;
      gisDistrict = gisResult.gisDistrict || station.district;
      method = "GIS_PIP";
      confidence = "HIGH";
      console.log(`${prefix} → GIS detected: District="${gisDistrict}", Taluka="${taluka}"`);
    }
  }

  // ── Tier 4: Spatial Fallback ─────────────────────────────────────────────
  if (!taluka) {
    const spatialResult = await resolveViaSpatialFallback(station, mappedStations);
    if (spatialResult) {
      // Spatial gives us a direct assessmentUnitId, skip DB lookup
      console.log(
        `${prefix} → SPATIAL_FALLBACK to "${spatialResult.taluka}" (${spatialResult.distanceKm} km)`
      );
      return {
        station,
        resolved: true,
        assessmentUnitId: spatialResult.assessmentUnitId,
        detectedTaluka: spatialResult.taluka,
        detectedDistrict: station.district,
        method: spatialResult.method,
        confidence: spatialResult.confidence,
        distanceKm: spatialResult.distanceKm,
      };
    }
  }

  if (!taluka) {
    console.log(`${prefix} → UNRESOLVED. No GIS match and no spatial fallback.`);
    return { station, resolved: false, reason: "NO_MATCH" };
  }

  // ── DB Lookup: Normalize taluka → AssessmentUnit ─────────────────────────
  const lookupDistrict = gisDistrict || station.district;
  const match = await findAssessmentUnit(station.state, lookupDistrict, taluka);

  if (!match) {
    console.log(
      `${prefix} → Taluka "${taluka}" found but no AssessmentUnit matched for District="${lookupDistrict}"`
    );
    return {
      station,
      resolved: false,
      reason: "AU_NOT_FOUND",
      detectedTaluka: taluka,
      detectedDistrict: lookupDistrict,
      method,
    };
  }

  console.log(
    `${prefix} → Resolved: Taluka="${match.unit.taluka}", AssessmentUnit="${match.unit.id}" [${method}, ${match.matchType}]`
  );

  return {
    station,
    resolved: true,
    assessmentUnitId: match.unit.id,
    detectedTaluka: match.unit.taluka,
    detectedDistrict: lookupDistrict,
    method,
    matchType: match.matchType,
    confidence,
  };
}

// ─── Batch Resolver ───────────────────────────────────────────────────────────
export async function resolveAllUnmappedStations({ dryRun = true } = {}) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Admin Boundary Resolver — ${dryRun ? "DRY RUN" : "LIVE UPDATE"}`);
  console.log(`${"=".repeat(60)}\n`);

  const allStations = await prisma.station.findMany({
    include: { assessmentUnit: true },
  });

  const unmapped = allStations.filter((s) => !s.assessmentUnitId);
  const mapped = allStations.filter(
    (s) => s.assessmentUnitId && s.assessmentUnit
  );

  console.log(`Total stations     : ${allStations.length}`);
  console.log(`Already mapped     : ${mapped.length}`);
  console.log(`To resolve         : ${unmapped.length}`);
  console.log("");

  const results = {
    total: allStations.length,
    alreadyMapped: mapped.length,
    processed: unmapped.length,
    resolved: 0,
    failed: 0,
    byMethod: {},
    failures: [],
    successes: [],
  };

  for (const station of unmapped) {
    const result = await resolveStationAssessmentUnit(station, mapped);

    if (result.resolved) {
      results.resolved++;
      results.byMethod[result.method] =
        (results.byMethod[result.method] || 0) + 1;
      results.successes.push({
        stationId: station.id,
        stationName: station.stationName,
        district: station.district,
        lat: station.latitude,
        lng: station.longitude,
        detectedTaluka: result.detectedTaluka,
        assessmentUnitId: result.assessmentUnitId,
        method: result.method,
        confidence: result.confidence,
      });

      // Add to mapped array dynamically so other unmapped stations can fall back to it
      mapped.push({
        ...station,
        assessmentUnitId: result.assessmentUnitId,
        assessmentUnit: {
          id: result.assessmentUnitId,
          taluka: result.detectedTaluka
        }
      });

      if (!dryRun) {
        await prisma.station.update({
          where: { id: station.id },
          data: { assessmentUnitId: result.assessmentUnitId },
        });
      }
    } else {
      results.failed++;
      results.failures.push({
        stationId: station.id,
        stationName: station.stationName,
        district: station.district,
        lat: station.latitude,
        lng: station.longitude,
        reason: result.reason,
        detectedTaluka: result.detectedTaluka || null,
      });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Resolution Summary`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Processed          : ${results.processed}`);
  console.log(`Resolved           : ${results.resolved}`);
  console.log(`Failed             : ${results.failed}`);
  console.log(`By Method          :`, results.byMethod);
  if (dryRun) console.log(`\n⚠️  DRY RUN — no database changes made.`);
  else console.log(`\n✅  LIVE RUN — database updated.`);
  console.log(`${"=".repeat(60)}\n`);

  return results;
}
