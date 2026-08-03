import API_CONFIG from "../config/api.config.js";

import { fetchGroundwaterData } from "./nwdp.service.js";

import {
  mapStation,
  mapReading,
} from "../mappers/groundwater.mapper.js";

import {
  findOrCreateStation,
} from "../repositories/station.repository.js";

import { enrichStationMetadata } from "./metadataEnrichment.service.js";

import {
  findOrCreateReading,
} from "../repositories/reading.repository.js";

import {
  getIncompleteIngestion,
  createIngestionLog,
  updateIngestionProgress,
  markIngestionCompleted,
  markIngestionFailed,
} from "../repositories/ingestionLog.repository.js";

export const ingestGroundwaterData = async () => {
  let log;
  try {
    // ==========================================
    // Start Timer
    // ==========================================
    const startTime = Date.now();

    console.log("\n======================================");
    console.log("     NWDP DATA INGESTION STARTED");
    console.log("======================================\n");

    // ==========================================
    // Phase 1 : Initialization
    // ==========================================

    const batchSize = API_CONFIG.nwdp.batchSize;

    let offset = 0;
    let totalRecords = 0;

    const stats = {
      cacheHits: 0,
      databaseHits: 0,
      stationsCreated: 0,
      newReadings: 0,
      duplicateReadings: 0,
      processedRecords: 0,
    };

    const runningLog = await getIncompleteIngestion();

    if (runningLog) {
      log = runningLog;
      offset = log.lastOffset;
      stats.processedRecords = log.recordsFetched;
      stats.newReadings = log.recordsInserted;

      console.log("--------------------------------------");
      console.log("Resuming Previous Ingestion");
      console.log(`Offset : ${offset}`);
      console.log("--------------------------------------");
    } else {
      log = await createIngestionLog();
      offset = 0;

      console.log("--------------------------------------");
      console.log("Starting New Ingestion");
      console.log("--------------------------------------");
    }

    // ==========================================
    // Phase 2 : Batch Processing
    // ==========================================

    do {
      const batchNumber = Math.floor(offset / batchSize) + 1;
      const result = await fetchGroundwaterData(batchSize, offset);

      const records = result.records;
      totalRecords = result.total;

      const progress = (
        (stats.processedRecords / totalRecords) *
        100
      ).toFixed(2);

      console.log("--------------------------------------");
      console.log(`Batch              : ${batchNumber}`);
      console.log(`Offset             : ${offset}`);
      console.log(`Records            : ${records.length}`);
      console.log(`Processed          : ${stats.processedRecords}/${totalRecords}`);
      console.log(`Progress           : ${progress}%`);
      console.log("--------------------------------------");

      // --------------------------------------
      // Process Current Batch
      // --------------------------------------

      for (const record of records) {
        try {
          // -----------------------------
          // Station
          // -----------------------------

          const stationData = mapStation(record);

          const {
            station,
            source,
          } = await findOrCreateStation(stationData);

          // Enrich station metadata with Aquifer Type and Assessment Unit
          await enrichStationMetadata(station);

          switch (source) {
            case "CACHE":
              stats.cacheHits++;
              break;

            case "DATABASE":
              stats.databaseHits++;
              break;

            case "CREATED":
              stats.stationsCreated++;
              break;
          }

          // -----------------------------
          // Reading
          // -----------------------------

          const readingData = mapReading(
            record,
            station.id
          );

          const {
            created,
          } = await findOrCreateReading(readingData);

          if (created) {
            stats.newReadings++;
          } else {
            stats.duplicateReadings++;
          }

          stats.processedRecords++;

        } catch (error) {
          console.error(
            `Error processing station "${record["Station"]}"`,
            error.message
          );
        }
      }

      console.log(
        `Completed Batch ${batchNumber} (${stats.processedRecords}/${totalRecords})`
      );

      console.log("");

      offset += records.length;

      await updateIngestionProgress(log.id, {
        lastOffset: offset,
        recordsFetched: stats.processedRecords,
        recordsInserted: stats.newReadings,
        message: `Completed Batch ${batchNumber}`,
      });

    } while (offset < totalRecords);

    // ==========================================
    // Phase 3 : Final Summary
    // ==========================================

    await markIngestionCompleted(log.id, {
      lastOffset: offset,
      recordsFetched: stats.processedRecords,
      recordsInserted: stats.newReadings,
    });

    const executionTime = (
      (Date.now() - startTime) / 1000
    ).toFixed(2);

    console.log("\n======================================");
    console.log("      INGESTION COMPLETED");
    console.log("======================================");

    console.log(`Total Dataset Size  : ${totalRecords}`);
    console.log(`Processed Records   : ${stats.processedRecords}`);
    console.log(`Execution Time      : ${executionTime} sec`);

    console.log("--------------------------------------");

    console.log(`Cache Hits          : ${stats.cacheHits}`);
    console.log(`Database Hits       : ${stats.databaseHits}`);
    console.log(`Stations Created    : ${stats.stationsCreated}`);

    console.log("--------------------------------------");

    console.log(`New Readings        : ${stats.newReadings}`);
    console.log(`Duplicate Readings  : ${stats.duplicateReadings}`);

    console.log("======================================\n");

  } catch (error) {
    console.error("Ingestion Failed:", error.message);
    if (log && log.id) {
      try {
        await markIngestionFailed(log.id, error.message);
      } catch (failedError) {
        console.error("Failed to mark ingestion as failed:", failedError.message);
      }
    }
    throw error;
  }
};