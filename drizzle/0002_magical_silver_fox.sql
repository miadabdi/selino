CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"bucket_name" varchar(255) NOT NULL,
	"path" varchar(512) NOT NULL,
	"filename" varchar(512) NOT NULL,
	"mimetype" varchar(255),
	"size_in_bytes" bigint,
	"checksum" varchar(255),
	"is_public" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"uploaded_by" integer
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;