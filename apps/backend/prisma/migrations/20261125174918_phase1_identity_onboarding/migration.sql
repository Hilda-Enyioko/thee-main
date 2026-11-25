/*
  Warnings:

  - You are about to drop the `partners` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'KYC_REVIEWER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "OrgUserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "DistributorType" AS ENUM ('DEALER_SHOP', 'API_PARTNER');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('MOTOR', 'GADGET');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "KeyMode" AS ENUM ('SANDBOX', 'LIVE');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('SYSTEM', 'STAFF', 'PROVIDER_USER', 'DISTRIBUTOR_USER', 'CUSTOMER');

-- AlterEnum
ALTER TYPE "PartnerStatus" ADD VALUE 'UNDER_REVIEW';

-- DropTable
DROP TABLE "partners";

-- DropEnum
DROP TYPE "PartnerType";

-- CreateTable
CREATE TABLE "staff_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trading_name" TEXT,
    "rc_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING_KYC',
    "settlement_bank_name" TEXT,
    "settlement_account_number" TEXT,
    "settlement_account_name" TEXT,
    "adapter_key" TEXT NOT NULL DEFAULT 'sandbox',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_users" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "OrgUserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_kyc" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'SUBMITTED',
    "details" JSONB NOT NULL,
    "documents" JSONB NOT NULL,
    "reviewed_by_id" UUID,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributors" (
    "id" UUID NOT NULL,
    "type" "DistributorType" NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trading_name" TEXT,
    "rc_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING_KYC',
    "settlement_bank_name" TEXT,
    "settlement_account_number" TEXT,
    "settlement_account_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributor_users" (
    "id" UUID NOT NULL,
    "distributor_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "OrgUserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributor_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributor_kyc" (
    "id" UUID NOT NULL,
    "distributor_id" UUID NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'SUBMITTED',
    "details" JSONB NOT NULL,
    "documents" JSONB NOT NULL,
    "reviewed_by_id" UUID,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributor_api_keys" (
    "id" UUID NOT NULL,
    "distributor_id" UUID NOT NULL,
    "prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "mode" "KeyMode" NOT NULL,
    "scopes" TEXT[],
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "full_name" TEXT NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_providers" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_distributors" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "distributor_id" UUID NOT NULL,
    "external_id" TEXT,
    "consent_recorded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_distributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "type" "ProductType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "terms" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_plans" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cover_amount" DECIMAL(18,2) NOT NULL,
    "pricing_rule" JSONB NOT NULL,
    "installments_ok" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributor_access_grants" (
    "id" UUID NOT NULL,
    "distributor_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "status" "GrantStatus" NOT NULL DEFAULT 'PENDING',
    "commission_bps" INTEGER,
    "reviewed_by_id" UUID,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_code" INTEGER,
    "response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "providers_rc_number_key" ON "providers"("rc_number");

-- CreateIndex
CREATE UNIQUE INDEX "providers_email_key" ON "providers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "provider_users_email_key" ON "provider_users"("email");

-- CreateIndex
CREATE INDEX "provider_users_provider_id_idx" ON "provider_users"("provider_id");

-- CreateIndex
CREATE INDEX "provider_kyc_provider_id_created_at_idx" ON "provider_kyc"("provider_id", "created_at");

-- CreateIndex
CREATE INDEX "provider_kyc_status_idx" ON "provider_kyc"("status");

-- CreateIndex
CREATE UNIQUE INDEX "distributors_rc_number_key" ON "distributors"("rc_number");

-- CreateIndex
CREATE UNIQUE INDEX "distributors_email_key" ON "distributors"("email");

-- CreateIndex
CREATE INDEX "distributors_type_idx" ON "distributors"("type");

-- CreateIndex
CREATE UNIQUE INDEX "distributor_users_email_key" ON "distributor_users"("email");

-- CreateIndex
CREATE INDEX "distributor_users_distributor_id_idx" ON "distributor_users"("distributor_id");

-- CreateIndex
CREATE INDEX "distributor_kyc_distributor_id_created_at_idx" ON "distributor_kyc"("distributor_id", "created_at");

-- CreateIndex
CREATE INDEX "distributor_kyc_status_idx" ON "distributor_kyc"("status");

-- CreateIndex
CREATE UNIQUE INDEX "distributor_api_keys_prefix_key" ON "distributor_api_keys"("prefix");

-- CreateIndex
CREATE INDEX "distributor_api_keys_distributor_id_idx" ON "distributor_api_keys"("distributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customer_providers_provider_id_idx" ON "customer_providers"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_providers_customer_id_provider_id_key" ON "customer_providers"("customer_id", "provider_id");

-- CreateIndex
CREATE INDEX "customer_distributors_distributor_id_idx" ON "customer_distributors"("distributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_distributors_customer_id_distributor_id_key" ON "customer_distributors"("customer_id", "distributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_distributors_distributor_id_external_id_key" ON "customer_distributors"("distributor_id", "external_id");

-- CreateIndex
CREATE INDEX "products_type_status_idx" ON "products"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "products_provider_id_code_key" ON "products"("provider_id", "code");

-- CreateIndex
CREATE INDEX "product_plans_product_id_idx" ON "product_plans"("product_id");

-- CreateIndex
CREATE INDEX "distributor_access_grants_provider_id_status_idx" ON "distributor_access_grants"("provider_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "distributor_access_grants_distributor_id_product_id_key" ON "distributor_access_grants"("distributor_id", "product_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_actor_id_idx" ON "audit_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_scope_key_key" ON "idempotency_keys"("scope", "key");

-- AddForeignKey
ALTER TABLE "provider_users" ADD CONSTRAINT "provider_users_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_kyc" ADD CONSTRAINT "provider_kyc_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_kyc" ADD CONSTRAINT "provider_kyc_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributor_users" ADD CONSTRAINT "distributor_users_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributor_kyc" ADD CONSTRAINT "distributor_kyc_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributor_kyc" ADD CONSTRAINT "distributor_kyc_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributor_api_keys" ADD CONSTRAINT "distributor_api_keys_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_providers" ADD CONSTRAINT "customer_providers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_providers" ADD CONSTRAINT "customer_providers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_distributors" ADD CONSTRAINT "customer_distributors_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_distributors" ADD CONSTRAINT "customer_distributors_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_plans" ADD CONSTRAINT "product_plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributor_access_grants" ADD CONSTRAINT "distributor_access_grants_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributor_access_grants" ADD CONSTRAINT "distributor_access_grants_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributor_access_grants" ADD CONSTRAINT "distributor_access_grants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
