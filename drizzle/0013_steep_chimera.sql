CREATE TYPE "public"."trade_credit_approval_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."purchase_request_status" ADD VALUE 'pending_credit_approval' BEFORE 'confirmed';--> statement-breakpoint
ALTER TYPE "public"."trade_credit_audit_action" ADD VALUE 'over_limit_requested';--> statement-breakpoint
ALTER TYPE "public"."trade_credit_audit_action" ADD VALUE 'over_limit_approved';--> statement-breakpoint
ALTER TYPE "public"."trade_credit_audit_action" ADD VALUE 'over_limit_rejected';--> statement-breakpoint
CREATE TABLE "trade_credit_approval_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"agreement_id" integer NOT NULL,
	"purchase_request_id" integer NOT NULL,
	"invoice_id" integer,
	"requested_by" integer NOT NULL,
	"owner_business_account_id" integer NOT NULL,
	"requested_amount" numeric NOT NULL,
	"debt_limit" numeric NOT NULL,
	"current_debt" numeric NOT NULL,
	"projected_debt" numeric NOT NULL,
	"over_limit_amount" numeric NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"status" "trade_credit_approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp with time zone,
	"rejected_by" integer,
	"rejected_at" timestamp with time zone,
	"note" text,
	CONSTRAINT "trade_credit_approval_requests_amount_check" CHECK ("trade_credit_approval_requests"."requested_amount" > 0 and "trade_credit_approval_requests"."over_limit_amount" > 0),
	CONSTRAINT "trade_credit_approval_requests_debt_check" CHECK ("trade_credit_approval_requests"."projected_debt" > "trade_credit_approval_requests"."debt_limit")
);
--> statement-breakpoint
ALTER TABLE "trade_credit_agreements" DROP CONSTRAINT "trade_credit_agreements_used_credit_check";--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_agreement_id_trade_credit_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."trade_credit_agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_owner_business_account_id_business_accounts_id_fk" FOREIGN KEY ("owner_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trade_credit_approval_requests_agreement_idx" ON "trade_credit_approval_requests" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "trade_credit_approval_requests_purchase_request_idx" ON "trade_credit_approval_requests" USING btree ("purchase_request_id");--> statement-breakpoint
CREATE INDEX "trade_credit_approval_requests_owner_status_idx" ON "trade_credit_approval_requests" USING btree ("owner_business_account_id","status");--> statement-breakpoint
ALTER TABLE "trade_credit_agreements" ADD CONSTRAINT "trade_credit_agreements_used_credit_check" CHECK ("trade_credit_agreements"."used_credit" >= 0);