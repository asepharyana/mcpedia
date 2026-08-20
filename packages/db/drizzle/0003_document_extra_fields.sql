-- Add extra_fields JSONB column to documents table for dynamic metadata
-- (CTF writeup fields: event, challenge, category, difficulty, points, etc.)
ALTER TABLE "documents" ADD COLUMN "extra_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;
