ALTER TABLE "store_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."store_member_role";--> statement-breakpoint
CREATE TYPE "public"."store_member_role" AS ENUM('owner', 'manager', 'seller', 'gatherer');--> statement-breakpoint
ALTER TABLE "store_members" ALTER COLUMN "role" SET DATA TYPE "public"."store_member_role" USING "role"::"public"."store_member_role";