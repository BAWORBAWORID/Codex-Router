import { z } from "zod";
export const CompressToolOutputSchema = z.object({
    enabled: z.boolean(),
    compressGit: z.boolean(),
    compressGrep: z.boolean(),
    compressFileLists: z.boolean(),
    compressLogs: z.boolean(),
    stripAnsiAndWhitespace: z.boolean(),
    minCharacterThreshold: z.number().min(0).default(50)
});
export const LazySeniorDevSchema = z.object({
    enabled: z.boolean(),
    mode: z.enum(["balanced", "strict"]),
    customInstructions: z.string().optional()
});
export const CompressLlmOutputSchema = z.object({
    enabled: z.boolean(),
    mode: z.enum(["terse", "ultra_terse"]),
    stripPleasantries: z.boolean(),
    customPrompt: z.string().optional()
});
export const TokenSaverSettingsSchema = z.object({
    enabled: z.boolean(),
    compressToolOutput: CompressToolOutputSchema,
    lazySeniorDev: LazySeniorDevSchema,
    compressLlmOutput: CompressLlmOutputSchema
});
