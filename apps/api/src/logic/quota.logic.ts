import { getQuotaSummaryDB } from "@codex/db";
import type { QuotaResponse } from "@codex/types";

export class QuotaLogic {
    public static async getQuotaInfo(): Promise<QuotaResponse> {
        return await getQuotaSummaryDB();
    }
}
