import { fetchGroundwaterData } from "./nwdp.service.js";

import {
  mapStation,
  mapReading,
} from "../mappers/groundwater.mapper.js";

import {
  findOrCreateStation,
} from "../repositories/station.repository.js";

import {
  findOrCreateReading,
} from "../repositories/reading.repository.js";

export const ingestGroundwaterData = async () => {
  try {
    console.log("\n======================================");
    console.log("     NWDP DATA INGESTION STARTED");
    console.log("======================================\n");

    // Fetch first batch
    const result = await fetchGroundwaterData();

    const records = result.records;

    console.log(`Total Records Available : ${result.total}`);
    console.log(`Current Batch Size      : ${records.length}\n`);

    let newStations = 0;
    let existingStations = 0;

    let newReadings = 0;
    let duplicateReadings = 0;

    for (const record of records) {
      try {
        // -------------------------
        // Map Station
        // -------------------------
        const stationData = mapStation(record);

        const {
          station,
          created: stationCreated,
        } = await findOrCreateStation(stationData);

        if (stationCreated) {
          newStations++;
        } else {
          existingStations++;
        }

        // -------------------------
        // Map Reading
        // -------------------------
        const readingData = mapReading(record, station.id);

        const {
          created: readingCreated,
        } = await findOrCreateReading(readingData);

        if (readingCreated) {
          newReadings++;
        } else {
          duplicateReadings++;
        }

      } catch (error) {
        console.error(
          `Error processing station "${record["Station"]}" :`,
          error.message
        );
      }
    }

    console.log("\n======================================");
    console.log("      INGESTION COMPLETED");
    console.log("======================================");

    console.log(`Total Dataset Size    : ${result.total}`);
    console.log(`Batch Processed       : ${records.length}`);

    console.log(`New Stations          : ${newStations}`);
    console.log(`Existing Stations     : ${existingStations}`);

    console.log(`New Readings          : ${newReadings}`);
    console.log(`Duplicate Readings    : ${duplicateReadings}`);

    console.log("======================================\n");

  } catch (error) {
    console.error("Ingestion Failed:", error.message);
    throw error;
  }
};