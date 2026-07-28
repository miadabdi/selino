CREATE TYPE "public"."invoice_status" AS ENUM('pending_credit_approval', 'pending', 'sent', 'delivered', 'paid', 'rejected', 'expired');--> statement-breakpoint
ALTER TYPE "public"."trade_credit_approval_status" ADD VALUE 'expired';--> statement-breakpoint

ALTER TABLE "invoices" RENAME COLUMN "business_account_id" TO "supplier_business_account_id";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_business_account_id_business_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "purchase_requests" DROP CONSTRAINT "purchase_requests_business_account_id_business_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" DROP CONSTRAINT "trade_credit_approval_requests_invoice_id_invoices_id_fk";--> statement-breakpoint

ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DATA TYPE "public"."invoice_status" USING "status"::"public"."invoice_status";--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."invoice_status";--> statement-breakpoint

ALTER TABLE "invoices" ADD COLUMN "buyer_business_account_id" integer;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN "buyer_business_account_id" integer;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint

UPDATE "purchase_requests" pr
SET "buyer_business_account_id" = (
  SELECT bm."business_account_id"
  FROM "business_members" bm
  WHERE bm."user_id" = pr."requester_id"
  ORDER BY bm."is_active" DESC, bm."id"
  LIMIT 1
);--> statement-breakpoint

UPDATE "invoices" invoice
SET "buyer_business_account_id" = pr."buyer_business_account_id"
FROM "purchase_requests" pr
WHERE pr."id" = invoice."purchase_request_id";--> statement-breakpoint

UPDATE "invoices" invoice
SET "buyer_business_account_id" = (
  SELECT bm."business_account_id"
  FROM "business_members" bm
  WHERE bm."user_id" = invoice."buyer_id"
  ORDER BY bm."is_active" DESC, bm."id"
  LIMIT 1
)
WHERE invoice."buyer_business_account_id" IS NULL;--> statement-breakpoint

INSERT INTO "invoices" (
  "supplier_business_account_id",
  "buyer_business_account_id",
  "buyer_id",
  "purchase_request_id",
  "invoice_number",
  "status",
  "total_amount",
  "currency"
)
SELECT
  pr."business_account_id",
  pr."buyer_business_account_id",
  pr."requester_id",
  pr."id",
  'INV-LEGACY-APPROVAL-' || approval."id",
  CASE
    WHEN approval."status" = 'pending' THEN 'pending_credit_approval'::"public"."invoice_status"
    WHEN approval."status" = 'rejected' THEN 'rejected'::"public"."invoice_status"
    ELSE 'pending'::"public"."invoice_status"
  END,
  approval."requested_amount",
  approval."currency"
FROM "trade_credit_approval_requests" approval
JOIN "purchase_requests" pr ON pr."id" = approval."purchase_request_id"
WHERE approval."invoice_id" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "invoices" existing
    WHERE existing."purchase_request_id" = pr."id"
      AND existing."supplier_business_account_id" = pr."business_account_id"
  );--> statement-breakpoint

UPDATE "trade_credit_approval_requests" approval
SET "invoice_id" = invoice."id"
FROM "purchase_requests" pr
JOIN "invoices" invoice
  ON invoice."purchase_request_id" = pr."id"
 AND invoice."supplier_business_account_id" = pr."business_account_id"
WHERE approval."purchase_request_id" = pr."id"
  AND approval."invoice_id" IS NULL;--> statement-breakpoint

INSERT INTO "invoice_items" (
  "invoice_id",
  "product_id",
  "store_inventory_id",
  "description",
  "qty",
  "unit_price",
  "total"
)
SELECT
  approval."invoice_id",
  item."product_id",
  item."store_inventory_id",
  NULL,
  item."qty",
  item."price",
  item."total"
FROM "trade_credit_approval_requests" approval
JOIN "purchase_request_items" item
  ON item."purchase_request_id" = approval."purchase_request_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "invoice_items" existing
  WHERE existing."invoice_id" = approval."invoice_id"
);--> statement-breakpoint

UPDATE "trade_credit_approval_requests"
SET "owner_business_account_id" = agreement."supplier_business_account_id",
    "expires_at" = "trade_credit_approval_requests"."created_at" + interval '60 minutes'
FROM "trade_credit_agreements" agreement
WHERE agreement."id" = "trade_credit_approval_requests"."agreement_id";--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "purchase_requests" WHERE "buyer_business_account_id" IS NULL)
    OR EXISTS (SELECT 1 FROM "invoices" WHERE "buyer_business_account_id" IS NULL)
    OR EXISTS (SELECT 1 FROM "trade_credit_approval_requests" WHERE "invoice_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill buyer business or approval invoice; repair orphaned memberships before migration';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "invoices" ALTER COLUMN "buyer_business_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_requests" ALTER COLUMN "buyer_business_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ALTER COLUMN "invoice_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ALTER COLUMN "expires_at" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_business_account_id_business_accounts_id_fk" FOREIGN KEY ("supplier_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyer_business_account_id_business_accounts_id_fk" FOREIGN KEY ("buyer_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_buyer_business_account_id_business_accounts_id_fk" FOREIGN KEY ("buyer_business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "purchase_requests" DROP COLUMN "business_account_id";--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_purchase_request_supplier_unique" UNIQUE("purchase_request_id","supplier_business_account_id");--> statement-breakpoint
ALTER TABLE "trade_credit_approval_requests" ADD CONSTRAINT "trade_credit_approval_requests_invoice_unique" UNIQUE("invoice_id");
