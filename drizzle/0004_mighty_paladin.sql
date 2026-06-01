ALTER TABLE "disbursements" DROP COLUMN "payment_alias";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "expiration_date";--> statement-breakpoint
ALTER TABLE "refunds" DROP COLUMN "reason";