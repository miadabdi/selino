ALTER TABLE "business_accounts" ADD COLUMN "license_number" varchar(100);--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "license_issued_at" date;--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "license_expires_at" date;--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "license_file_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "national_code" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_license_file_id_files_id_fk" FOREIGN KEY ("license_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_national_code_unique" UNIQUE("national_code");