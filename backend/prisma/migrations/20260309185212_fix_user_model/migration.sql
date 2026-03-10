/*
  Warnings:

  - A unique constraint covering the columns `[userID,projectID]` on the table `ProjectMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "Board" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "projectID" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Column" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "wipLimit" INTEGER,
    "boardID" INTEGER NOT NULL,

    CONSTRAINT "Column_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkTransition" (
    "id" SERIAL NOT NULL,
    "boardID" INTEGER NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,

    CONSTRAINT "WorkTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkTransition_boardID_fromStatus_toStatus_key" ON "WorkTransition"("boardID", "fromStatus", "toStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_userID_projectID_key" ON "ProjectMember"("userID", "projectID");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_projectID_fkey" FOREIGN KEY ("projectID") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_boardID_fkey" FOREIGN KEY ("boardID") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTransition" ADD CONSTRAINT "WorkTransition_boardID_fkey" FOREIGN KEY ("boardID") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
