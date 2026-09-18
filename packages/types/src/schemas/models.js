import { z } from "zod";
export const ModelObjectSchema = z.object({
    id: z.string(),
    object: z.literal("model"),
    created: z.number().optional(),
    owned_by: z.string(),
    custom: z.boolean().optional()
});
export const ModelListResponseSchema = z.object({
    object: z.literal("list"),
    data: z.array(ModelObjectSchema)
});
