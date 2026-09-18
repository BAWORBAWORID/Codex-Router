import { z } from "zod";
export const FallbackRuleSchema = z.object({
    id: z.string().optional(),
    sourceModel: z
        .string({ required_error: "Field 'sourceModel' is required" })
        .min(1, "Field 'sourceModel' cannot be empty"),
    targetModel: z
        .string({ required_error: "Field 'targetModel' is required" })
        .min(1, "Field 'targetModel' cannot be empty"),
    priority: z.number().int().nonnegative().default(1),
    enabled: z.boolean().default(true),
    triggerOnStatus: z.array(z.number().int()).optional(),
    maxRetries: z.number().int().nonnegative().optional()
});
export const UpdateFallbackRuleSchema = FallbackRuleSchema.partial();
