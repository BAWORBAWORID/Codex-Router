import { KNOWN_PROVIDERS } from "./providers.js";
export const DEFAULT_PROVIDERS = Object.freeze(KNOWN_PROVIDERS.map(({ alias: _alias, ...seed }) => seed));
export const DEFAULT_PROVIDER_MAP = Object.freeze(Object.fromEntries(DEFAULT_PROVIDERS.map((seed) => [seed.id, seed])));
export const SEED_MARKER = "__seed__";
export function isSeedProvider(row) {
    return row.providerSpecificData?.[SEED_MARKER] === "true";
}
