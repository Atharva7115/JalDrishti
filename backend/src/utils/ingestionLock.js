let isRunning = false;

export const getIngestionStatus = () => isRunning;

export const startIngestionLock = () => {
  if (isRunning) return false;
  isRunning = true;
  return true;
};

export const releaseIngestionLock = () => {
  isRunning = false;
};