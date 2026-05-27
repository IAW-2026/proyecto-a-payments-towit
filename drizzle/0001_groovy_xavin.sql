ALTER TABLE "refunds" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "balance" numeric(12, 2) DEFAULT '0.00' NOT NULL;