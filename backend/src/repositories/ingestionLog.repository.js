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
 * Returns the latest incomplete ingestion.
 * Used for Resume Support.
 */
export const getIncompleteIngestion = async () => {
  return prisma.ingestionLog.findFirst({
    where: {
      status: "RUNNING",
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