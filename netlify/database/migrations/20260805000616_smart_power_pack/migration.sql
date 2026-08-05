CREATE TABLE "crm_configs" (
	"id" serial PRIMARY KEY,
	"company_name" varchar(200) NOT NULL,
	"industry" varchar(80) NOT NULL,
	"team_size" varchar(40) NOT NULL,
	"sales_motion" varchar(60) NOT NULL,
	"primary_goal" varchar(60) NOT NULL,
	"monthly_leads" integer DEFAULT 0 NOT NULL,
	"integrations" jsonb DEFAULT '[]' NOT NULL,
	"blueprint" jsonb NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
