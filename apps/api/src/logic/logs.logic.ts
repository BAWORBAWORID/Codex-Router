import { getRecentLogsDB, getUsageByModelDB, getUsageSummaryDB } from "@codex/db";
import type { RequestLogEntry, UsageStats } from "@codex/types";
import { formatCost } from "@codex/pricing";

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
