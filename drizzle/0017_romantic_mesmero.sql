CREATE TYPE "public"."business_address_type" AS ENUM('headquarters', 'billing', 'shipping', 'warehouse', 'other');--> statement-breakpoint
CREATE TYPE "public"."business_supplier_link_status" AS ENUM('pending', 'active', 'suspended', 'rejected', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."business_wallet_status" AS ENUM('active', 'frozen', 'closed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."report_export_format" AS ENUM('pdf', 'xlsx', 'csv');--> statement-breakpoint
CREATE TYPE "public"."report_export_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."report_export_type" AS ENUM('performance', 'sales', 'orders', 'suppliers', 'credit', 'invoices');--> statement-breakpoint
CREATE TYPE "public"."shipment_location_source" AS ENUM('manual', 'gps', 'carrier', 'system');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'ready_for_pickup', 'in_transit', 'delayed', 'delivered', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_direction" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('deposit', 'withdrawal', 'payment', 'refund', 'adjustment', 'reservation', 'release');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('wallet', 'credit', 'bank_transfer', 'gateway');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_category" AS ENUM('account', 'catalog', 'credit', 'invoice', 'order', 'payment', 'shipment', 'technical', 'other');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed');--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "business_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"business_account_id" integer NOT NULL,
	"type" "business_address_type" DEFAULT 'other' NOT NULL,
	"label" varchar(100),
	"recipient_name" varchar(255),
	"phone" varchar(30),
	"country_code" varchar(2) DEFAULT 'IR' NOT NULL,
	"province" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"address_line" text NOT NULL,
	"postal_code" varchar(20),
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "business_addresses_latitude_check" CHECK ("business_addresses"."latitude" is null or ("business_addresses"."latitude" >= -90 and "business_addresses"."latitude" <= 90)),
	CONSTRAINT "business_addresses_longitude_check" CHECK ("business_addresses"."longitude" is null or ("business_addresses"."longitude" >= -180 and "business_addresses"."longitude" <= 180)),
	CONSTRAINT "business_addresses_coordinate_pair_check" CHECK (("business_addresses"."latitude" is null and "business_addresses"."longitude" is null) or ("business_addresses"."latitude" is not null and "business_addresses"."longitude" is not null))
);
--> statement-breakpoint
CREATE TABLE "business_supplier_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"buyer_business_account_id" integer NOT NULL,
	"supplier_business_account_id" integer NOT NULL,
	"status" "business_supplier_link_status" DEFAULT 'pending' NOT NULL,
	"display_name" varchar(255),
	"contact_name" varchar(255),
	"contact_phone" varchar(30),
	"contact_email" varchar(255),
	"notes" text,
	"requested_by" integer,
	"approved_by" integer,
	"approved_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	CONSTRAINT "business_supplier_links_distinct_accounts_check" CHECK ("business_supplier_links"."buyer_business_account_id" <> "business_supplier_links"."supplier_business_account_id")
);
--> statement-breakpoint
CREATE TABLE "business_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"business_account_id" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"balance" numeric DEFAULT 0 NOT NULL,
	"reserved_balance" numeric DEFAULT 0 NOT NULL,
	"available_balance" numeric GENERATED ALWAYS AS (balance - reserved_balance) STORED,
	"status" "business_wallet_status" DEFAULT 'active' NOT NULL,
	"frozen_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "business_wallets_balance_check" CHECK ("business_wallets"."balance" >= 0),
	CONSTRAINT "business_wallets_reserved_balance_check" CHECK ("business_wallets"."reserved_balance" >= 0 and "business_wallets"."reserved_balance" <= "business_wallets"."balance")
);
--> statement-breakpoint
CREATE TABLE "invoice_status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invoice_id" integer NOT NULL,
	"previous_status" "invoice_status",
	"status" "invoice_status" NOT NULL,
	"reason" text,
	"metadata" json,
	"changed_by" integer
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	"business_account_id" integer NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT false NOT NULL,
	"categories" json DEFAULT '{}'::json NOT NULL,
	CONSTRAINT "notification_preferences_user_business_unique" UNIQUE("user_id","business_account_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"order_number" varchar(30) DEFAULT concat('ORD-', floor(random() * 900000000000 + 100000000000)::bigint::text) NOT NULL,
	"invoice_id" integer NOT NULL,
	"purchase_request_id" integer,
	"buyer_business_account_id" integer NOT NULL,
	"supplier_business_account_id" integer NOT NULL,
	"shipping_address_id" integer,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"total_amount" numeric NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"notes" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" integer,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_invoice_unique" UNIQUE("invoice_id"),
	CONSTRAINT "orders_total_amount_check" CHECK ("orders"."total_amount" >= 0),
	CONSTRAINT "orders_distinct_accounts_check" CHECK ("orders"."buyer_business_account_id" <> "orders"."supplier_business_account_id")
);
--> statement-breakpoint
CREATE TABLE "order_status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" integer NOT NULL,
	"previous_status" "order_status",
	"status" "order_status" NOT NULL,
	"reason" text,
	"metadata" json,
	"changed_by" integer
);
--> statement-breakpoint
CREATE TABLE "purchase_request_status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purchase_request_id" integer NOT NULL,
	"previous_status" "purchase_request_status",
	"status" "purchase_request_status" NOT NULL,
	"reason" text,
	"metadata" json,
	"changed_by" integer
);
--> statement-breakpoint
CREATE TABLE "report_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"business_account_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"file_id" integer,
	"type" "report_export_type" NOT NULL,
	"format" "report_export_format" NOT NULL,
	"status" "report_export_status" DEFAULT 'pending' NOT NULL,
	"parameters" json DEFAULT '{}'::json NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shipment_location_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shipment_id" integer NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"accuracy_meters" numeric(10, 2),
	"status" "shipment_status",
	"source" "shipment_location_source" DEFAULT 'manual' NOT NULL,
	"metadata" json,
	"recorded_by" integer,
	CONSTRAINT "shipment_location_events_latitude_check" CHECK ("shipment_location_events"."latitude" >= -90 and "shipment_location_events"."latitude" <= 90),
	CONSTRAINT "shipment_location_events_longitude_check" CHECK ("shipment_location_events"."longitude" >= -180 and "shipment_location_events"."longitude" <= 180),
	CONSTRAINT "shipment_location_events_accuracy_check" CHECK ("shipment_location_events"."accuracy_meters" is null or "shipment_location_events"."accuracy_meters" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"order_id" integer NOT NULL,
	"origin_address_id" integer,
	"destination_address_id" integer,
	"tracking_number" varchar(100),
	"carrier" varchar(255),
	"status" "shipment_status" DEFAULT 'pending' NOT NULL,
	"estimated_delivery_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delayed_at" timestamp with time zone,
	"delay_reason" text,
	"current_latitude" numeric(9, 6),
	"current_longitude" numeric(9, 6),
	"last_location_at" timestamp with time zone,
	"notes" text,
	"created_by" integer,
	CONSTRAINT "shipments_current_latitude_check" CHECK ("shipments"."current_latitude" is null or ("shipments"."current_latitude" >= -90 and "shipments"."current_latitude" <= 90)),
	CONSTRAINT "shipments_current_longitude_check" CHECK ("shipments"."current_longitude" is null or ("shipments"."current_longitude" >= -180 and "shipments"."current_longitude" <= 180)),
	CONSTRAINT "shipments_current_coordinate_pair_check" CHECK (("shipments"."current_latitude" is null and "shipments"."current_longitude" is null) or ("shipments"."current_latitude" is not null and "shipments"."current_longitude" is not null))
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"wallet_id" integer NOT NULL,
	"invoice_id" integer,
	"type" "wallet_transaction_type" NOT NULL,
	"direction" "wallet_transaction_direction" NOT NULL,
	"amount" numeric NOT NULL,
	"balance_before" numeric NOT NULL,
	"balance_after" numeric NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"reference_type" varchar(100),
	"reference_id" varchar(255),
	"idempotency_key" varchar(255),
	"description" text,
	"metadata" json,
	"created_by" integer,
	CONSTRAINT "wallet_transactions_amount_check" CHECK ("wallet_transactions"."amount" > 0),
	CONSTRAINT "wallet_transactions_balance_check" CHECK ("wallet_transactions"."balance_before" >= 0 and "wallet_transactions"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_account_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"wallet_id" integer,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric NOT NULL,
	"refunded_amount" numeric DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"provider" varchar(100),
	"provider_reference" varchar(255),
	"failure_code" varchar(100),
	"failure_message" text,
	"metadata" json,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_by" integer,
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" > 0),
	CONSTRAINT "payments_refunded_amount_check" CHECK ("payments"."refunded_amount" >= 0 and "payments"."refunded_amount" <= "payments"."amount"),
	CONSTRAINT "payments_wallet_method_check" CHECK ("payments"."method" <> 'wallet' or "payments"."wallet_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"ticket_number" varchar(30) DEFAULT concat('SUP-', floor(random() * 900000000000 + 100000000000)::bigint::text) NOT NULL,
	"business_account_id" integer NOT NULL,
	"requester_id" integer NOT NULL,
	"assigned_to" integer,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" "support_ticket_category" DEFAULT 'other' NOT NULL,
	"priority" "support_ticket_priority" DEFAULT 'normal' NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"related_entity_type" varchar(100),
	"related_entity_id" integer,
	"resolution" text,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"ticket_id" integer NOT NULL,
	"author_id" integer,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ticket_id" integer NOT NULL,
	"message_id" integer,
	"file_id" integer NOT NULL,
	"uploaded_by" integer,
	CONSTRAINT "support_ticket_attachments_file_unique" UNIQUE("file_id")
);
--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "legal_name" varchar(255);--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "registration_number" varchar(100);--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "national_id" varchar(100);--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "tax_id" varchar(100);--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "phone" varchar(30);--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "business_accounts" ADD COLUMN "website" varchar(500);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "business_account_id" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_addresses" ADD CONSTRAINT "business_addresses_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_addresses" ADD CONSTRAINT "business_addresses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_addresses" ADD CONSTRAINT "business_addresses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_supplier_links" ADD CONSTRAINT "business_supplier_links_buyer_business_account_id_business_accounts_id_fk" FOREIGN KEY ("buyer_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_supplier_links" ADD CONSTRAINT "business_supplier_links_supplier_business_account_id_business_accounts_id_fk" FOREIGN KEY ("supplier_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_supplier_links" ADD CONSTRAINT "business_supplier_links_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_supplier_links" ADD CONSTRAINT "business_supplier_links_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_wallets" ADD CONSTRAINT "business_wallets_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_status_events" ADD CONSTRAINT "invoice_status_events_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_status_events" ADD CONSTRAINT "invoice_status_events_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_business_account_id_business_accounts_id_fk" FOREIGN KEY ("buyer_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_business_account_id_business_accounts_id_fk" FOREIGN KEY ("supplier_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_business_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."business_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_status_events" ADD CONSTRAINT "purchase_request_status_events_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_status_events" ADD CONSTRAINT "purchase_request_status_events_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_location_events" ADD CONSTRAINT "shipment_location_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_location_events" ADD CONSTRAINT "shipment_location_events_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_origin_address_id_business_addresses_id_fk" FOREIGN KEY ("origin_address_id") REFERENCES "public"."business_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_destination_address_id_business_addresses_id_fk" FOREIGN KEY ("destination_address_id") REFERENCES "public"."business_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_business_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."business_wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_wallet_id_business_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."business_wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_message_id_support_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."support_ticket_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_addresses_account_idx" ON "business_addresses" USING btree ("business_account_id");--> statement-breakpoint
CREATE INDEX "business_addresses_account_type_idx" ON "business_addresses" USING btree ("business_account_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "business_addresses_default_account_unique" ON "business_addresses" USING btree ("business_account_id") WHERE "business_addresses"."deleted_at" is null and "business_addresses"."is_default" = true;--> statement-breakpoint
CREATE INDEX "business_supplier_links_buyer_status_idx" ON "business_supplier_links" USING btree ("buyer_business_account_id","status");--> statement-breakpoint
CREATE INDEX "business_supplier_links_supplier_status_idx" ON "business_supplier_links" USING btree ("supplier_business_account_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_supplier_links_active_pair_unique" ON "business_supplier_links" USING btree ("buyer_business_account_id","supplier_business_account_id") WHERE "business_supplier_links"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "business_wallets_account_idx" ON "business_wallets" USING btree ("business_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_wallets_active_account_currency_unique" ON "business_wallets" USING btree ("business_account_id","currency") WHERE "business_wallets"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "invoice_status_events_invoice_created_idx" ON "invoice_status_events" USING btree ("invoice_id","created_at");--> statement-breakpoint
CREATE INDEX "invoice_status_events_status_idx" ON "invoice_status_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_buyer_status_created_idx" ON "orders" USING btree ("buyer_business_account_id","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_supplier_status_created_idx" ON "orders" USING btree ("supplier_business_account_id","status","created_at");--> statement-breakpoint
CREATE INDEX "orders_purchase_request_idx" ON "orders" USING btree ("purchase_request_id");--> statement-breakpoint
CREATE INDEX "order_status_events_order_created_idx" ON "order_status_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_status_events_status_idx" ON "order_status_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchase_request_status_events_request_created_idx" ON "purchase_request_status_events" USING btree ("purchase_request_id","created_at");--> statement-breakpoint
CREATE INDEX "purchase_request_status_events_status_idx" ON "purchase_request_status_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "report_exports_business_created_idx" ON "report_exports" USING btree ("business_account_id","created_at");--> statement-breakpoint
CREATE INDEX "report_exports_requester_created_idx" ON "report_exports" USING btree ("requested_by","created_at");--> statement-breakpoint
CREATE INDEX "report_exports_status_idx" ON "report_exports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shipment_location_events_shipment_recorded_idx" ON "shipment_location_events" USING btree ("shipment_id","recorded_at");--> statement-breakpoint
CREATE INDEX "shipments_order_status_idx" ON "shipments" USING btree ("order_id","status");--> statement-breakpoint
CREATE INDEX "shipments_status_estimated_delivery_idx" ON "shipments" USING btree ("status","estimated_delivery_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_active_tracking_number_unique" ON "shipments" USING btree ("tracking_number") WHERE "shipments"."deleted_at" is null and "shipments"."tracking_number" is not null;--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_occurred_at_idx" ON "wallet_transactions" USING btree ("wallet_id","occurred_at");--> statement-breakpoint
CREATE INDEX "wallet_transactions_invoice_idx" ON "wallet_transactions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "wallet_transactions_reference_idx" ON "wallet_transactions" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transactions_idempotency_key_unique" ON "wallet_transactions" USING btree ("idempotency_key") WHERE "wallet_transactions"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "payments_business_created_at_idx" ON "payments" USING btree ("business_account_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_key_unique" ON "payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_reference_unique" ON "payments" USING btree ("provider","provider_reference") WHERE "payments"."provider_reference" is not null;--> statement-breakpoint
CREATE INDEX "support_tickets_business_status_updated_idx" ON "support_tickets" USING btree ("business_account_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "support_tickets_requester_status_idx" ON "support_tickets" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "support_tickets_assignee_status_idx" ON "support_tickets" USING btree ("assigned_to","status");--> statement-breakpoint
CREATE INDEX "support_tickets_related_entity_idx" ON "support_tickets" USING btree ("related_entity_type","related_entity_id");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_created_idx" ON "support_ticket_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_author_idx" ON "support_ticket_messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "support_ticket_attachments_ticket_idx" ON "support_ticket_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_ticket_attachments_message_idx" ON "support_ticket_attachments" USING btree ("message_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE cascade ON UPDATE no action;