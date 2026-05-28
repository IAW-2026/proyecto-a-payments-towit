ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_trip_id_unique" UNIQUE("trip_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_trip_id_unique" UNIQUE("trip_id");