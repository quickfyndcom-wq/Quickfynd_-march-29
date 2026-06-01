-- CreateTable
CREATE TABLE "GridSection" (
    "id" SERIAL NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "productIds" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GridSection_pkey" PRIMARY KEY ("id")
);
