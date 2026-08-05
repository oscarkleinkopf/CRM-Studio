import { integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import type { CrmBlueprint } from "../shared/types";

export const crmConfigs = pgTable("crm_configs", {
  id: serial().primaryKey(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 80 }).notNull(),
  teamSize: varchar("team_size", { length: 40 }).notNull(),
  salesMotion: varchar("sales_motion", { length: 60 }).notNull(),
  primaryGoal: varchar("primary_goal", { length: 60 }).notNull(),
  monthlyLeads: integer("monthly_leads").notNull().default(0),
  integrations: jsonb("integrations").$type<string[]>().notNull().default([]),
  blueprint: jsonb("blueprint").$type<CrmBlueprint>().notNull(),
  summary: text("summary").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CrmConfigRow = typeof crmConfigs.$inferSelect;
export type NewCrmConfig = typeof crmConfigs.$inferInsert;
