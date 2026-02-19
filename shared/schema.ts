import { pgTable, text, serial, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const requestLogs = pgTable("request_logs", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  service: text("service").notNull(),
  priceUsdc: doublePrecision("price_usdc").notNull(),
  inputLength: integer("input_length").default(0).notNull(),
  outputLength: integer("output_length").default(0).notNull(),
  durationMs: integer("duration_ms").default(0).notNull(),
  paid: integer("paid").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRequestLogSchema = createInsertSchema(requestLogs).omit({
  id: true,
  createdAt: true,
});

export type RequestLog = typeof requestLogs.$inferSelect;
export type InsertRequestLog = z.infer<typeof insertRequestLogSchema>;

export const SERVICES = {
  summarize: { price: 0.005, description: "Summarize any text or article into key points" },
  translate: { price: 0.003, description: "Translate text between any languages" },
  "code-review": { price: 0.02, description: "Review code for bugs, security, and improvements" },
  explain: { price: 0.005, description: "Explain complex topics in simple terms" },
  "generate-prompt": { price: 0.01, description: "Generate optimized AI image prompts" },
} as const;

export type ServiceKey = keyof typeof SERVICES;

export const tryServiceSchema = z.object({
  service: z.enum(["summarize", "translate", "code-review", "explain", "generate-prompt"]),
  input: z.string().min(1).max(10000),
  options: z.record(z.string()).optional(),
});
export type TryServiceRequest = z.infer<typeof tryServiceSchema>;
