import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function main() {
  const stations = await p.station.findMany({
    where: { NOT: { assessmentUnitId: null } },
    include: { assessmentUnit: true }
  });

  console.log(`Total mapped stations available for audit: ${stations.length}`);

  // Let's categorize them based on how they matched
  // Since we don't store the match method in the Station table, we will simulate the check using the resolver logic
  // direct match: station tehsil/block matches AU taluka case-insensitively
  // alias match: station tehsil/block does not match directly but matches via alias
  // GIS match: station block/tehsil is null/empty but resolved via GIS
  
  const direct = [];
  const alias = [];
  const gis = [];

  const TALUKA_ALIASES_LOWER = {
    "ahmednagar": "Ahmadnagar", "ahmedanagar": "Ahmadnagar", "shirur": "SHIRUR", "yevla": "YEOLA", "yeola": "YEOLA",
    "niphad": "NIPHAD", "sinnar": "SINNAR", "dindori": "DINDORI", "baglan": "BAGLAN", "satana": "SATANA",
    "malegaon": "MALEGAON", "chandwad": "CHANDWAD", "deola": "DEOLA", "igatpuri": "IGATPURI", "peth": "PETH",
    "surgana": "SURGANA", "trimbakeshwar": "TRIMBAKESHWAR", "nandgaon": "NANDGAON", "kopargaon": "KOPARGAON",
    "rahata": "RAHATA", "nevasa": "NEVASA", "shrirampur": "SHRIRAMPUR", "rahuri": "RAHURI", "sangamner": "SANGAMNER",
    "akole": "AKOLE", "jamkhed": "JAMKHED", "parner": "PARNER", "shevgaon": "SHEVGAON", "pathardi": "PATHARDI",
    "karjat": "KARJAT", "osmanabad": "OSMANABAD", "tuljapur": "TULJAPUR", "latur": "LATUR", "ausa": "AUSA",
    "udgir": "UDGIR", "nilanga": "NILANGA", "chakur": "Chakur", "renapur": "RENAPUR", "deoni": "DEONI",
    "jalkot": "JALKOT", "madha": "MADHA", "solapur south": "SOLAPUR SOUTH", "solapur north": "SOLAPUR NORTH",
    "barshi": "BARSHI", "mangalvedha": "MANGALVEDHA", "pandharpur": "PANDHARPUR", "mohol": "MOHOL",
    "karmala": "KARMALA", "malshiras": "MALSHIRAS", "sangola": "SANGOLA", "akkalkot": "AKKALKOT",
    "amalner": "AMALNER", "jalgaon": "JALGAON", "bhusawal": "BHUSAWAL", "erandol": "ERANDOL", "chalisgaon": "CHALISGAON",
    "pachora": "PACHORA", "jamner": "JAMNER", "yawal": "YAWAL", "muktainagar": "MUKTAINAGAR", "raver": "RAVER",
    "parola": "PAROLA", "sangrampur": "SANGRAMPUR", "khamgaon": "KHAMGAON", "nandura": "NANDURA", "malkapur": "MALKAPUR",
    "motala": "MOTALA", "jalgaon jamod": "JALGAON JAMOD", "shegaon": "SHEGAON", "mehkar": "MEHKAR", "lonar": "LONAR",
    "deulgaon raja": "DEULGAON RAJA", "chikhli": "CHIKHLI", "phaltan": "PHALTAN", "satara": "SATARA", "karad": "KARAD",
    "koregaon": "KOREGAON", "wai": "WAI", "mahabaleshwar": "MAHABALESHWAR", "jawali": "JAWALI", "khandala": "KHANDALA",
    "patan": "PATAN", "man": "MAN", "khatav": "KHATAV", "khatan": "KHATAV", "nagpur": "NAGPUR (RURAL)",
    "nagpur rural": "NAGPUR (RURAL)", "hingna": "HINGNA", "kamptee": "KAMPTEE", "katol": "KATOL", "savner": "SAVNER",
    "narkhed": "NARKHED", "ramtek": "RAMTEK", "mouda": "MOUDA", "parseoni": "PARSEONI", "umred": "UMRED",
    "kuhi": "KUHI", "bhiwapur": "BHIWAPUR", "dhamangaon railway": "DHAMANGAON RAILWAY", "achalpur": "ACHALPUR",
    "chandur railway": "CHANDUR RAILWAY", "anjangaon surji": "ANJANGAON SURJI", "warud": "WARUD", "morshi": "MORSHI",
    "teosa": "TEOSA", "tiwsa": "TIWSA", "amravati": "AMRAVATI", "nandgaon khandeshwar": "NANDGAON KHANDESHWAR",
    "balapur": "BALAPUR", "chandrapur": "CHANDRAPUR", "mul": "MUL", "bhadravati": "BHADRAVATI", "warora": "WARORA",
    "sindewahi": "SINDEWAHI", "rajura": "RAJURA", "korpana": "KORPANA", "jiwati": "JIWATI", "gondpipri": "GONDPIPRI",
    "chimur": "CHIMUR", "pombhurna": "POMBHURNA", "ballarpur": "BALLARPUR", "brahmapuri": "BRAHMAPURI", "nagbhid": "NAGBHID",
    "bhandara": "BHANDARA", "tumsar": "TUMSAR", "mohadi": "MOHADI", "pauni": "PAUNI", "sakoli": "SAKOLI",
    "lakhandur": "LAKHANDUR", "lakhani": "LAKHANI", "umarga": "UMARGA", "kallam": "KALLAM", "paranda": "PARANDA",
    "washi": "WASHI", "ghansavangi": "Ghansavangi", "jalna": "JALNA", "badnapur": "BADNAPUR", "partur": "PARTUR",
    "mantha": "MANTHA", "bhokardan": "BHOKARDAN", "ambad": "AMBAD", "jafrabad": "JAFRABAD", "hingoli": "HINGOLI",
    "sengaon": "SENGAON", "kalamnuri": "KALAMNURI", "aundha nagnath": "AUNDHA (NAGNATH)", "basmath": "BASMATH",
    "nashik": "NASHIK", "raigad": "ALIBAG", "alibag": "ALIBAG", "shrivardhan": "SHRIVARDHAN", "mahad": "MAHAD",
    "poladpur": "POLADPUR", "mhasala": "MHASALA", "roha": "ROHA", "murud": "MURUD", "tala": "TALA", "pen": "PEN",
    "uran": "URAN", "khalapur": "KHALAPUR", "panvel": "PANVEL",
    "shirur-kasar": "SHIRUR KA", "shirur-anantpal": "ANANTPAL SH", "desaiganj": "WADSA", "bavda": "GAGANBAWADA",
    "parseoni": "Parsivni", "edlabad": "Edalabad", "kavathe-mahankal": "Kavathe Mahankal"
  };

  const norm = (s) => (s || "").trim().toLowerCase();

  for (const s of stations) {
    const rawTaluka = s.block || s.tehsil;
    const hasRaw = rawTaluka && rawTaluka !== "null" && rawTaluka !== "-" && rawTaluka.trim() !== "";
    
    if (!hasRaw) {
      gis.push(s);
    } else {
      const nRaw = norm(rawTaluka);
      const exactMatch = norm(s.assessmentUnit.taluka) === nRaw;
      const aliasMatch = TALUKA_ALIASES_LOWER[nRaw] && norm(TALUKA_ALIASES_LOWER[nRaw]) === norm(s.assessmentUnit.taluka);
      
      if (exactMatch) {
        direct.push(s);
      } else if (aliasMatch) {
        alias.push(s);
      } else {
        // Fallback or substring match
        direct.push(s);
      }
    }
  }

  console.log(`Classified Counts:`);
  console.log(`  Direct Match  : ${direct.length}`);
  console.log(`  Alias Match   : ${alias.length}`);
  console.log(`  GIS Match     : ${gis.length}`);

  // Randomly select 20 from each
  const directAudited = shuffle(direct).slice(0, 20);
  const aliasAudited = shuffle(alias).slice(0, 20);
  const gisAudited = shuffle(gis).slice(0, 20);

  console.log("\n--- AUDIT: 20 DIRECT MATCH STATIONS ---");
  directAudited.forEach((s, i) => {
    console.log(`  ${i+1}. Station: ${s.stationName.padEnd(25)} | DB Taluka: ${(s.block || s.tehsil).padEnd(20)} | Mapped AU: ${s.assessmentUnit.taluka}`);
  });

  console.log("\n--- AUDIT: 20 ALIAS MATCH STATIONS ---");
  aliasAudited.forEach((s, i) => {
    console.log(`  ${i+1}. Station: ${s.stationName.padEnd(25)} | DB Taluka: ${(s.block || s.tehsil).padEnd(20)} | Mapped AU: ${s.assessmentUnit.taluka}`);
  });

  console.log("\n--- AUDIT: 20 GIS MATCH STATIONS ---");
  gisAudited.forEach((s, i) => {
    console.log(`  ${i+1}. Station: ${s.stationName.padEnd(25)} | DB Coords: (${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}) | Mapped AU: ${s.assessmentUnit.taluka}`);
  });

  await p.$disconnect();
}

main().catch(console.error);
