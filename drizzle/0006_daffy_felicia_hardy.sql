CREATE TYPE "public"."file_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_channel" AS ENUM('sms', 'email', 'push', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."purchase_request_status" AS ENUM('new', 'confirmed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."refresh_token_revoked_reason" AS ENUM('logout', 'rotate', 'admin_revoke', 'logout_all', 'suspected_reuse');--> statement-breakpoint
CREATE TYPE "public"."store_inventory_transaction_reason" AS ENUM('restock', 'sale', 'cancellation', 'adjustment', 'reservation_expired');--> statement-breakpoint
CREATE TYPE "public"."store_member_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."file_status";--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "status" SET DATA TYPE "public"."file_status" USING "status"::"public"."file_status";--> statement-breakpoint
ALTER TABLE "notification_deliveries" ALTER COLUMN "channel" SET DATA TYPE "public"."notification_delivery_channel" USING "channel"::"public"."notification_delivery_channel";--> statement-breakpoint
ALTER TABLE "notification_deliveries" ALTER COLUMN "status" SET DATA TYPE "public"."notification_delivery_status" USING "status"::"public"."notification_delivery_status";--> statement-breakpoint
ALTER TABLE "purchase_requests" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."purchase_request_status";--> statement-breakpoint
ALTER TABLE "purchase_requests" ALTER COLUMN "status" SET DATA TYPE "public"."purchase_request_status" USING "status"::"public"."purchase_request_status";--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "revoked_reason" SET DATA TYPE "public"."refresh_token_revoked_reason" USING "revoked_reason"::"public"."refresh_token_revoked_reason";--> statement-breakpoint
ALTER TABLE "store_inventory_transactions" ALTER COLUMN "reason" SET DATA TYPE "public"."store_inventory_transaction_reason" USING "reason"::"public"."store_inventory_transaction_reason";--> statement-breakpoint
ALTER TABLE "store_members" ALTER COLUMN "role" SET DATA TYPE "public"."store_member_role" USING "role"::"public"."store_member_role";