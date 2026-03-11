-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_reporterID_fkey";

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reporterID_fkey" FOREIGN KEY ("reporterID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
