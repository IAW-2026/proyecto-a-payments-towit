CREATE TYPE "public"."refund_type_enum" AS ENUM('TOTAL', 'PARTIAL');--> statement-breakpoint
CREATE TABLE "disbursements" (
	"transaction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"id_user" integer NOT NULL,
	"payment_alias" varchar(255) NOT NULL,
	"platform_fee" numeric(12, 2) NOT NULL,
	"external_id" varchar(255),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"transaction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" varchar(255) NOT NULL,
	"id_user" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"external_id" varchar(255),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expiration_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"transaction_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"id_user" integer NOT NULL,
	"refund_type" "refund_type_enum" NOT NULL,
	"external_id" varchar(255),
	"reason" text,
	"status" varchar(50) DEFAULT 'REQUESTED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id_user" serial PRIMARY KEY NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE no action ON UPDATE no action;