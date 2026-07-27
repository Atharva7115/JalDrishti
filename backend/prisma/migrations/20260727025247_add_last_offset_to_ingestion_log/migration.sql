/*
  Warnings:

  - Changed the type of `status` on the `IngestionLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "IngestionLog" ADD COLUMN     "lastOffset" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;
