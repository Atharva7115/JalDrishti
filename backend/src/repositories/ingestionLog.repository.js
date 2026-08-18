import prisma from "../config/prisma.js";

/**
 * Returns the latest ingestion job.
 */
export const getLatestIngestionLog = async () => {
  return prisma.ingestionLog.findFirst({
    orderBy: {
      startedAt: "desc",
    },
  });
};

/**
 * Returns the latest resumable ingestion.
 * Used for Resume Support.
 *
 * Resumes from:
 *   - RUNNING  → server was live but process was interrupted mid-batch
 *   - FAILED   → network error (ECONNRESET) crashed NWDP fetch, but
 *                 lastOffset was already checkpointed after the last
 *                 successful batch, so we can continue from there.
 *
 * A FAILED log is only resumable if lastOffset > 0 (it actually made
 * some progress). A fresh FAILED log at offset 0 is ignored so we
 * don't loop on a permanent error.
 */
export const getIncompleteIngestion = async () => {
  return prisma.ingestionLog.findFirst({
    where: {
      OR: [
        { status: "RUNNING" },
        {
          status: "FAILED",
          lastOffset: { gt: 0 },   // only resume if progress was made
        },
      ],
    },
    orderBy: {
      startedAt: "desc",
    },
  });
};

/**
 * Starts a new ingestion job.
 */
export const createIngestionLog = async () => {
  return prisma.ingestionLog.create({
    data: {
      status: "RUNNING",
      message: "Groundwater ingestion started.",
    },
  });
};

/**
 * Updates checkpoint after every successful batch.
 */
export const updateIngestionProgress = async (
  logId,
  {
    lastOffset,
    recordsFetched,
    recordsInserted,
    message,
  }
) => {
  return prisma.ingestionLog.update({
    where: {
      id: logId,
    },
    data: {
      lastOffset,
      recordsFetched,
      recordsInserted,
      message,
    },
  });
};

/**
 * Marks ingestion as completed.
 */
export const markIngestionCompleted = async (
  logId,
  {
    lastOffset,
    recordsFetched,
    recordsInserted,
  }
) => {
  return prisma.ingestionLog.update({
    where: {
      id: logId,
    },
    data: {
      completedAt: new Date(),
      lastOffset,
      recordsFetched,
      recordsInserted,
      status: "COMPLETED",
      message: "Groundwater ingestion completed successfully.",
    },
  });
};

/**
 * Marks ingestion as failed.
 */
export const markIngestionFailed = async (
  logId,
  errorMessage
) => {
  return prisma.ingestionLog.update({
    where: {
      id: logId,
    },
    data: {
      completedAt: new Date(),
      status: "FAILED",
      message: errorMessage,
    },
  });
};

/**
 * Resets a FAILED ingestion back to RUNNING so it can be resumed.
 * Called at the start of each resume attempt to ensure future crashes
 * are also resumable from the updated checkpoint.
 */
export const resetIngestionToRunning = async (logId) => {
  return prisma.ingestionLog.update({
    where: { id: logId },
    data: {
      status: "RUNNING",
      completedAt: null,
      message: "Resumed after previous failure.",
    },
  });
};

/**
 * Clears stale RUNNING jobs.
 * Used when an administrator wants to reset
 * an interrupted ingestion.
 */
export const resetRunningIngestions = async () => {
  return prisma.ingestionLog.updateMany({
    where: {
      status: "RUNNING",
    },
    data: {
      completedAt: new Date(),
      status: "FAILED",
      message: "Marked as FAILED due to system restart.",
    },
  });
};