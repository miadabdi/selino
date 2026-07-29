UPDATE "invoices"
SET "invoice_number" = (
  1000000000 + mod("id"::bigint * 2654435759, 9000000000)
)::text;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "invoice_number" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "invoice_number" SET DEFAULT (floor(random() * 9000000000)::bigint + 1000000000)::text;
