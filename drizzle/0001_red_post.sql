ALTER TABLE "auth_otps" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_otps" ADD COLUMN "email" varchar(255);

ALTER TABLE auth_otps
ADD CONSTRAINT auth_otps_phone_or_email_check
CHECK (
    phone IS NOT NULL
    OR email IS NOT NULL
);
