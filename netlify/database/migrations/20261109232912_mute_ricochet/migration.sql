ALTER TABLE "crm_configs" ADD COLUMN "owner_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "crm_configs" ADD CONSTRAINT "crm_configs_owner_token_hash_key" UNIQUE("owner_token_hash");