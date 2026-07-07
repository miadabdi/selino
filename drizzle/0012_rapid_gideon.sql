CREATE TYPE "public"."trade_credit_agreement_status" AS ENUM('draft', 'pending_signatures', 'active', 'suspended', 'expired', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."trade_credit_audit_action" AS ENUM('created', 'updated', 'signed', 'activated', 'suspended', 'cancelled', 'closed', 'transaction_created', 'settlement_created', 'settlement_confirmed');--> statement-breakpoint
CREATE TYPE "public"."trade_credit_settlement_status" AS ENUM('draft', 'pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."trade_credit_signature_party" AS ENUM('buyer', 'supplier');--> statement-breakpoint
CREATE TYPE "public"."trade_credit_transaction_type" AS ENUM('purchase', 'return', 'adjustment', 'settlement');--> statement-breakpoint
CREATE TABLE "trade_credit_agreement_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agreement_id" integer NOT NULL,
	"party" "trade_credit_signature_party" NOT NULL,
	"business_account_id" integer NOT NULL,
	"signed_by" integer NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signature_payload" json,
	"ip_address" varchar(100),
	"user_agent" text,
	CONSTRAINT "trade_credit_signatures_party_unique" UNIQUE("agreement_id","party")
);
--> statement-breakpoint
CREATE TABLE "trade_credit_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"buyer_business_account_id" integer NOT NULL,
	"supplier_business_account_id" integer NOT NULL,
	"label" varchar(255),
	"description" text,
	"credit_limit" numeric DEFAULT 0 NOT NULL,
	"used_credit" numeric DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"settlement_cycle" varchar(50) DEFAULT 'monthly' NOT NULL,
	"settlement_day_of_month" integer,
	"requires_buyer_signature" boolean DEFAULT true NOT NULL,
	"requires_supplier_signature" boolean DEFAULT true NOT NULL,
	"buyer_signed_at" timestamp with time zone,
	"supplier_signed_at" timestamp with time zone,
	"status" "trade_credit_agreement_status" DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"created_by" integer,
	CONSTRAINT "trade_credit_agreements_distinct_accounts_check" CHECK ("trade_credit_agreements"."buyer_business_account_id" <> "trade_credit_agreements"."supplier_business_account_id"),
	CONSTRAINT "trade_credit_agreements_credit_limit_check" CHECK ("trade_credit_agreements"."credit_limit" >= 0),
	CONSTRAINT "trade_credit_agreements_used_credit_check" CHECK ("trade_credit_agreements"."used_credit" >= 0 and "trade_credit_agreements"."used_credit" <= "trade_credit_agreements"."credit_limit"),
	CONSTRAINT "trade_credit_agreements_settlement_day_check" CHECK ("trade_credit_agreements"."settlement_day_of_month" is null or ("trade_credit_agreements"."settlement_day_of_month" >= 1 and "trade_credit_agreements"."settlement_day_of_month" <= 31))
);
--> statement-breakpoint
CREATE TABLE "trade_credit_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agreement_id" integer NOT NULL,
	"action" "trade_credit_audit_action" NOT NULL,
	"actor_user_id" integer,
	"actor_business_account_id" integer,
	"before" json,
	"after" json,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "trade_credit_settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"agreement_id" integer NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"opening_balance" numeric DEFAULT 0 NOT NULL,
	"total_purchases" numeric DEFAULT 0 NOT NULL,
	"total_returns" numeric DEFAULT 0 NOT NULL,
	"total_adjustments" numeric DEFAULT 0 NOT NULL,
	"net_amount" numeric DEFAULT 0 NOT NULL,
	"closing_balance" numeric DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"status" "trade_credit_settlement_status" DEFAULT 'draft' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" integer,
	CONSTRAINT "trade_credit_settlements_period_unique" UNIQUE("agreement_id","period_start","period_end"),
	CONSTRAINT "trade_credit_settlements_period_check" CHECK ("trade_credit_settlements"."period_end" > "trade_credit_settlements"."period_start")
);
--> statement-breakpoint
CREATE TABLE "trade_credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agreement_id" integer NOT NULL,
	"type" "trade_credit_transaction_type" NOT NULL,
	"amount" numeric NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"reference_type" varchar(100),
	"reference_id" integer,
	"description" text,
	"metadata" json,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	CONSTRAINT "trade_credit_transactions_amount_check" CHECK ("trade_credit_transactions"."amount" <> 0)
);
--> statement-breakpoint
ALTER TABLE "trade_credit_agreement_signatures" ADD CONSTRAINT "trade_credit_agreement_signatures_agreement_id_trade_credit_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."trade_credit_agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_agreement_signatures" ADD CONSTRAINT "trade_credit_agreement_signatures_business_account_id_business_accounts_id_fk" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_agreement_signatures" ADD CONSTRAINT "trade_credit_agreement_signatures_signed_by_users_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_agreements" ADD CONSTRAINT "trade_credit_agreements_buyer_business_account_id_business_accounts_id_fk" FOREIGN KEY ("buyer_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_agreements" ADD CONSTRAINT "trade_credit_agreements_supplier_business_account_id_business_accounts_id_fk" FOREIGN KEY ("supplier_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_agreements" ADD CONSTRAINT "trade_credit_agreements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_audit_logs" ADD CONSTRAINT "trade_credit_audit_logs_agreement_id_trade_credit_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."trade_credit_agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_audit_logs" ADD CONSTRAINT "trade_credit_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_audit_logs" ADD CONSTRAINT "trade_credit_audit_logs_actor_business_account_id_business_accounts_id_fk" FOREIGN KEY ("actor_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_settlements" ADD CONSTRAINT "trade_credit_settlements_agreement_id_trade_credit_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."trade_credit_agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_settlements" ADD CONSTRAINT "trade_credit_settlements_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_transactions" ADD CONSTRAINT "trade_credit_transactions_agreement_id_trade_credit_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."trade_credit_agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_transactions" ADD CONSTRAINT "trade_credit_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trade_credit_signatures_agreement_idx" ON "trade_credit_agreement_signatures" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "trade_credit_agreements_buyer_idx" ON "trade_credit_agreements" USING btree ("buyer_business_account_id");--> statement-breakpoint
CREATE INDEX "trade_credit_agreements_supplier_idx" ON "trade_credit_agreements" USING btree ("supplier_business_account_id");--> statement-breakpoint
CREATE INDEX "trade_credit_agreements_pair_idx" ON "trade_credit_agreements" USING btree ("buyer_business_account_id","supplier_business_account_id");--> statement-breakpoint
CREATE INDEX "trade_credit_agreements_status_idx" ON "trade_credit_agreements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trade_credit_audit_logs_agreement_idx" ON "trade_credit_audit_logs" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "trade_credit_audit_logs_action_idx" ON "trade_credit_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "trade_credit_settlements_agreement_idx" ON "trade_credit_settlements" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "trade_credit_transactions_agreement_idx" ON "trade_credit_transactions" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "trade_credit_transactions_occurred_at_idx" ON "trade_credit_transactions" USING btree ("occurred_at");