-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('PROVIDER', 'DISTRIBUTOR_STAFF', 'DISTRIBUTOR_API');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING_KYC', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING_KYC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);
