import axios from "axios";

const targets = [
  { name: "Beldarpada", lat: 18.90085, lng: 72.929782 },
  { name: "Dhad_3", lat: 20.39711, lng: 75.999817 },
  { name: "Shivaji Nagar_1", lat: 18.533452, lng: 73.845387 }
];

async function geocode() {
  for (const t of targets) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${t.lat}&lon=${t.lng}&format=json&accept-language=en`;
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "JalDrishti-Geospatial-Audit-Agent/1.0 (Atharva7115; Google DeepMind pair programming)"
        }
      });
      console.log(`\nResults for ${t.name}:`);
      console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
      console.error(`Error for ${t.name}:`, e.message);
    }
    // Sleep to avoid rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }
}

geocode();
