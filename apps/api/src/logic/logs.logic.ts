import { getRecentLogsDB, getUsageByModelDB, getUsageSummaryDB } from "@srouter/db";
import type { RequestLogEntry, UsageStats } from "@srouter/types";
import { formatCost } from "@srouter/pricing";

export class LogsLogic {
    public static getRecentLogs(limit: number = 50): RequestLogEntry[] {
        return getRecentLogsDB(limit);
    }

    public static getUsageStats(): UsageStats {
        const summary = getUsageSummaryDB();
        const byModel = getUsageByModelDB();

        return {
            object: "usage",
            ...summary,
            costLabel: formatCost(summary.totalEstimatedCost),
            estimated: true,
            byModel
        };
    }
}
