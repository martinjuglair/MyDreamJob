-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('INTERESTED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED');

-- CreateTable
CREATE TABLE "CV" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "structuredData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT,
    "salary" TEXT,
    "rawContent" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3),
    "analysis" JSONB,
    "matchResult" JSONB,
    "adaptedCvText" TEXT,
    "interviewPrep" JSONB,
    "status" "JobStatus" NOT NULL DEFAULT 'INTERESTED',
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardPrize" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT,
    "color" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardPrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "redeemed" BOOLEAN NOT NULL DEFAULT false,
    "spunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpinResult_jobId_key" ON "SpinResult"("jobId");

-- AddForeignKey
ALTER TABLE "SpinResult" ADD CONSTRAINT "SpinResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinResult" ADD CONSTRAINT "SpinResult_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "RewardPrize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
