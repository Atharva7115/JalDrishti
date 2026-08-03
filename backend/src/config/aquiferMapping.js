/**
 * District to Aquifer Type mapping configuration.
 * Contains explicit geological rules for districts in Maharashtra.
 * 
 * Districts are in lowercase for case-insensitive matching.
 */
const AQUIFER_MAPPING = {
  // --- Tapi/Purna Basin districts (Alluvium) ---
  "dhule": "Sandy Alluvium",
  "nandurbar": "Sandy Alluvium",
  "jalgaon": "Sandy Alluvium",
  "akola": "Sandy Alluvium",
  "buldhana": "Sandy Alluvium",
  "amravati": "Sandy Alluvium",

  // --- Chandrapur region (Sandstone) ---
  "chandrapur": "Sandstone",

  // --- Granite/Gneiss districts (Eastern Vidarbha and part of Konkan) ---
  "bhandara": "Weathered Granite/Gneiss/Schist (Low Clay)",
  "gondia": "Weathered Granite/Gneiss/Schist (Low Clay)",
  "gadchiroli": "Weathered Granite/Gneiss/Schist (Low Clay)",
  "nagpur": "Weathered Granite/Gneiss/Schist (Low Clay)",
  "nanded": "Weathered Granite/Gneiss/Schist (Low Clay)",
  "sindhudurg": "Weathered Granite/Gneiss/Schist (Low Clay)",

  // --- Deccan Traps / Basalt region (Dominant geology for other Maharashtra districts) ---
  "pune": "Weathered/Vesicular Jointed Basalt",
  "satara": "Weathered/Vesicular Jointed Basalt",
  "solapur": "Weathered/Vesicular Jointed Basalt",
  "sangli": "Weathered/Vesicular Jointed Basalt",
  "kolhapur": "Weathered/Vesicular Jointed Basalt",
  "ahmednagar": "Weathered/Vesicular Jointed Basalt",
  "nashik": "Weathered/Vesicular Jointed Basalt",
  "aurangabad": "Weathered/Vesicular Jointed Basalt",
  "chhatrapati sambhajinagar": "Weathered/Vesicular Jointed Basalt",
  "jalna": "Weathered/Vesicular Jointed Basalt",
  "parbhani": "Weathered/Vesicular Jointed Basalt",
  "beed": "Weathered/Vesicular Jointed Basalt",
  "latur": "Weathered/Vesicular Jointed Basalt",
  "osmanabad": "Weathered/Vesicular Jointed Basalt",
  "dharashiv": "Weathered/Vesicular Jointed Basalt",
  "hingoli": "Weathered/Vesicular Jointed Basalt",
  "wardha": "Weathered/Vesicular Jointed Basalt",
  "washim": "Weathered/Vesicular Jointed Basalt",
  "yavatmal": "Weathered/Vesicular Jointed Basalt",
  "thane": "Weathered/Vesicular Jointed Basalt",
  "palghar": "Weathered/Vesicular Jointed Basalt",
  "raigad": "Weathered/Vesicular Jointed Basalt",
  "ratnagiri": "Weathered/Vesicular Jointed Basalt",
  "mumbai city": "Weathered/Vesicular Jointed Basalt",
  "mumbai suburban": "Weathered/Vesicular Jointed Basalt"
};

export default AQUIFER_MAPPING;
