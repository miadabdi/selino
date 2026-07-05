CREATE TYPE "public"."business_account_type" AS ENUM('store', 'company');--> statement-breakpoint
CREATE TABLE "business_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_account_id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_id" integer NOT NULL,
	"permission_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "features" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "features_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "package_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"feature_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "stores" RENAME TO "business_accounts";--> statement-breakpoint
ALTER TABLE "store_members" RENAME TO "business_members";--> statement-breakpoint
ALTER TABLE "invoices" RENAME COLUMN "store_id" TO "business_account_id";--> statement-breakpoint
ALTER TABLE "purchase_requests" RENAME COLUMN "store_id" TO "business_account_id";--> statement-breakpoint
ALTER TABLE "store_inventories" RENAME COLUMN "store_id" TO "business_account_id";--> statement-breakpoint
ALTER TABLE "business_members" RENAME COLUMN "store_id" TO "business_account_id";--> statement-breakpoint
ALTER TABLE "store_inventories" DROP CONSTRAINT "store_inventories_store_id_product_id_unique";--> statement-breakpoint
ALTER TABLE "business_members" DROP CONSTRAINT "store_members_store_id_user_id_unique";--> statement-breakpoint
ALTER TABLE "business_accounts" DROP CONSTRAINT "stores_slug_unique";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "purchase_requests" DROP CONSTRAINT "purchase_requests_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "store_inventories" DROP CONSTRAINT "store_inventories_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "business_members" DROP CONSTRAINT "store_members_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "business_members" DROP CONSTRAINT "store_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "business_accounts" DROP CONSTRAINT "stores_logo_file_id_files_id_fk";
--> statement-breakpoint
ALTER TABLE "business_accounts" DROP CONSTRAINT "stores_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "business_members" ADD COLUMN "role_id" integer;--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "type" "business_account_type" DEFAULT 'store' NOT NULL;--> statement-breakpoint
INSERT INTO "roles" ("name", "description") VALUES
	('manager', 'manager role'),
	('seller', 'seller role'),
	('collector', 'collector role')
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "business_members"
SET "role_id" = "roles"."id"
FROM "roles"
WHERE "roles"."name" = CASE "business_members"."role"
	WHEN 'owner' THEN 'manager'
	WHEN 'manager' THEN 'manager'
	WHEN 'seller' THEN 'seller'
	WHEN 'gatherer' THEN 'collector'
	ELSE 'seller'
END;--> statement-breakpoint
ALTER TABLE "business_members" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_permissions" ADD CONSTRAINT "feature_permissions_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_permissions" ADD CONSTRAINT "feature_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_features" ADD CONSTRAINT "package_features_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_features" ADD CONSTRAINT "package_features_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feature_permissions_feature_id_permission_id_idx" ON "feature_permissions" USING btree ("feature_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "package_features_package_id_feature_id_idx" ON "package_features" USING btree ("package_id","feature_id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_inventories" ADD CONSTRAINT "store_inventories_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_logo_file_id_files_id_fk" FOREIGN KEY ("logo_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "business_accounts" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "store_inventories" ADD CONSTRAINT "store_inventories_business_account_id_product_id_unique" UNIQUE("business_account_id","product_id");--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_account_id_user_id_unique" UNIQUE("business_account_id","user_id");--> statement-breakpoint
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_slug_unique" UNIQUE("slug");--> statement-breakpoint
DROP TYPE "public"."store_member_role";
