CREATE TABLE "document_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"slug" text NOT NULL,
	"revision_no" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"meta" jsonb NOT NULL,
	"reason" text DEFAULT 'index' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "document_revisions_document_id_idx" ON "document_revisions" USING btree ("document_id");
--> statement-breakpoint
CREATE INDEX "document_revisions_slug_idx" ON "document_revisions" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "document_revisions_doc_rev_idx" ON "document_revisions" USING btree ("document_id", "revision_no" DESC);
--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade;
