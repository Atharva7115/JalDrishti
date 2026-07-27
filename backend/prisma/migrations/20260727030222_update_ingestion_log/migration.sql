/*
  Warnings:

  - The values [SUCCESS,PARTIAL] on the enum `IngestionStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `IngestionLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IngestionStatus_new" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
ALTER TABLE "IngestionLog" ALTER COLUMN "status" TYPE "IngestionStatus_new" USING ("status"::text::"IngestionStatus_new");
ALTER TYPE "IngestionStatus" RENAME TO "IngestionStatus_old";
ALTER TYPE "IngestionStatus_new" RENAME TO "IngestionStatus";
DROP TYPE "public"."IngestionStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "IngestionLog" ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "recordsFetched" SET DEFAULT 0,
ALTER COLUMN "recordsInserted" SET DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "IngestionStatus" NOT NULL DEFAULT 'RUNNING';
