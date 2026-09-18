import { calculateCostFromTokens, getPricingForModel } from "@srouter/pricing";
const EMPTY_BREAKDOWN = {
    prompt_tokens: 0,
    completion_tokens: 0,
    cached_tokens: 0,
    cache_creation_tokens: 0,
    reasoning_tokens: 0,
    total_tokens: 0
};
function ExtractNumber(value) {
    return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}
export function ExtractUsageBreakdown(provider, usage) {
    if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
        return EMPTY_BREAKDOWN;
    }
    const raw_usage = usage;
    const provider_key = provider?.toLowerCase() ?? "";
    if (provider_key.includes("anthropic")) {
        const input_tokens = ExtractNumber(raw_usage.input_tokens);
        const output_tokens = ExtractNumber(raw_usage.output_tokens);
        const cached_tokens = ExtractNumber(raw_usage.cache_read_input_tokens);
        const cache_creation_tokens = ExtractNumber(raw_usage.cache_creation_input_tokens);
        const reasoning_obj = raw_usage.reasoning;
        return {
            prompt_tokens: input_tokens,
            completion_tokens: output_tokens,
            cached_tokens,
            cache_creation_tokens,
            reasoning_tokens: ExtractNumber(reasoning_obj?.reasoning_tokens),
            total_tokens: input_tokens + output_tokens
        };
    }
    const prompt_details = raw_usage.prompt_tokens_details;
    const completion_details = raw_usage.completion_tokens_details;
    const prompt_tokens = ExtractNumber(raw_usage.prompt_tokens);
    const completion_tokens = ExtractNumber(raw_usage.completion_tokens);
    const total_tokens = ExtractNumber(raw_usage.total_tokens);
    return {
        prompt_tokens,
        completion_tokens,
        cached_tokens: ExtractNumber(prompt_details?.cached_tokens),
        cache_creation_tokens: 0,
        reasoning_tokens: ExtractNumber(completion_details?.reasoning_tokens),
        total_tokens: total_tokens || prompt_tokens + completion_tokens
    };
}
export function EstimateCostForUsage(provider, model, breakdown) {
    const pricing = getPricingForModel(provider, model);
    return calculateCostFromTokens({
        prompt_tokens: breakdown.prompt_tokens,
        completion_tokens: breakdown.completion_tokens,
        cached_tokens: breakdown.cached_tokens,
        cache_creation_input_tokens: breakdown.cache_creation_tokens,
        reasoning_tokens: breakdown.reasoning_tokens
    }, pricing);
}
export const extractUsageBreakdown = ExtractUsageBreakdown;
export const estimateCostForUsage = EstimateCostForUsage;
