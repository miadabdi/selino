ALTER TABLE "users" ADD COLUMN "profile_picture_id" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_profile_picture_id_files_id_fk" FOREIGN KEY ("profile_picture_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;