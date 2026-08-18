import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_PATH = path.join(__dirname, "../data/india_taluk.geojson");

const raw = fs.readFileSync(GEOJSON_PATH, "utf-8");
const geojson = JSON.parse(raw);
const features = geojson.features;

const targets = [
  { name: "Beldarpada", lat: 18.90085, lng: 72.929782 },
  { name: "Dhad_3", lat: 20.39711, lng: 75.999817 },
  { name: "Shivaji Nagar_1", lat: 18.533452, lng: 73.845387 }
];

for (const t of targets) {
  console.log(`\nInvestigating target: ${t.name} (${t.lat}, ${t.lng})`);
  const pt = turf.point([t.lng, t.lat]);
  
  let found = false;
  let minDistance = Infinity;
  let nearestFeature = null;

  for (const f of features) {
    try {
      if (turf.booleanPointInPolygon(pt, f)) {
        console.log(`  Inside Polygon! Properties:`, JSON.stringify(f.properties, null, 2));
        found = true;
        break;
      }
    } catch (e) {
      // ignore turf error
    }

    // calculate distance to centroid or boundary
    try {
      const centroid = turf.centroid(f);
      const dist = turf.distance(pt, centroid);
      if (dist < minDistance) {
        minDistance = dist;
        nearestFeature = f;
      }
    } catch {}
  }

  if (!found) {
    console.log(`  Outside all polygons!`);
    if (nearestFeature) {
      console.log(`  Nearest Polygon Centroid Distance: ${minDistance.toFixed(2)} km`);
      console.log(`  Nearest Polygon Properties:`, JSON.stringify(nearestFeature.properties, null, 2));
    }
  }
}
