ALTER TABLE "disbursements" DROP CONSTRAINT "disbursements_trip_id_unique";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_trip_id_unique";--> statement-breakpoint
ALTER TABLE "disbursements" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_trip_disbursement" ON "disbursements" USING btree ("trip_id") WHERE "disbursements"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_trip_payment" ON "payments" USING btree ("trip_id") WHERE "payments"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_active_trip_refund" ON "refunds" USING btree ("trip_id") WHERE "refunds"."deleted_at" IS NULL;