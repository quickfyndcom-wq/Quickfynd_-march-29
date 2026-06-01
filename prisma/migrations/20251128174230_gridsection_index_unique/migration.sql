/*
  Warnings:

  - A unique constraint covering the columns `[index]` on the table `GridSection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GridSection_index_key" ON "GridSection"("index");
