import { db } from "./db";
import {
  requestLogs,
  type RequestLog,
  type InsertRequestLog,
} from "@shared/schema";
import { desc, sql } from "drizzle-orm";

export interface IStorage {
  logRequest(log: InsertRequestLog): Promise<RequestLog>;
  getStats(): Promise<{
    totalRequests: number;
    totalEarned: number;
    byService: Record<string, { calls: number; earned: number }>;
    last24h: number;
  }>;
  getRecentLogs(limit?: number): Promise<RequestLog[]>;
}

export class DatabaseStorage implements IStorage {
  async logRequest(log: InsertRequestLog): Promise<RequestLog> {
    const [entry] = await db.insert(requestLogs).values(log).returning();
    return entry;
  }

  async getStats() {
    const totalResult = await db
      .select({
        count: sql<number>`count(*)`,
        earned: sql<number>`coalesce(sum(${requestLogs.priceUsdc}), 0)`,
      })
      .from(requestLogs);

    const byServiceResult = await db
      .select({
        service: requestLogs.service,
        count: sql<number>`count(*)`,
        earned: sql<number>`coalesce(sum(${requestLogs.priceUsdc}), 0)`,
      })
      .from(requestLogs)
      .groupBy(requestLogs.service);

    const last24hResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(requestLogs)
      .where(sql`${requestLogs.createdAt} > now() - interval '24 hours'`);

    const byService: Record<string, { calls: number; earned: number }> = {};
    for (const row of byServiceResult) {
      byService[row.service] = {
        calls: Number(row.count),
        earned: Number(row.earned),
      };
    }

    return {
      totalRequests: Number(totalResult[0]?.count ?? 0),
      totalEarned: Number(totalResult[0]?.earned ?? 0),
      byService,
      last24h: Number(last24hResult[0]?.count ?? 0),
    };
  }

  async getRecentLogs(limit = 20): Promise<RequestLog[]> {
    return await db
      .select()
      .from(requestLogs)
      .orderBy(desc(requestLogs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
