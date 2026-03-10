/*
  Warnings:

  - You are about to drop the column `action` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `creatdAt` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `eventtype` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `reporterID` on table `Task` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "action",
ADD COLUMN     "eventtype" TEXT NOT NULL,
ADD COLUMN     "newValue" TEXT,
ADD COLUMN     "oldValue" TEXT;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "creatdAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "type" SET DEFAULT 'TASK',
ALTER COLUMN "priority" SET DEFAULT 'MEDIUM',
ALTER COLUMN "reporterID" SET NOT NULL;
