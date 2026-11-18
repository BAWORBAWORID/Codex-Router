import { SetAntigravityCliVersion } from "@codex/translator";

const MANIFEST_BASE_URL =
    "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app";
const FALLBACK_PLATFORM = "linux_amd64";
const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 12 * 60 * 60 * 1000;

let lastAttemptAt = 0;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Pull the latest Antigravity CLI version from the upstream manifest.
 * Fail-open: any error keeps the bundled fallback version in place.
 */
export async function refreshAntigravityCliVersion(Force = false): Promise<string | null> {
    const Now = Date.now();
    if (!Force && lastAttemptAt > 0 && Now - lastAttemptAt < CACHE_TTL_MS) return null;
    lastAttemptAt = Now;

    try {
        const Platform = process.env.ANTIGRAVITY_MANIFEST_PLATFORM || FALLBACK_PLATFORM;
        const Res = await fetch(`${MANIFEST_BASE_URL}/manifests/${Platform}.json`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        });
        if (!Res.ok) return null;

        const Data = (await Res.json()) as { version?: unknown };
        const Version = typeof Data.version === "string" ? Data.version.trim() : "";
        if (!/^\d+\.\d+\.\d+$/.test(Version)) return null;

        SetAntigravityCliVersion(Version);
        return Version;
    } catch {
        return null;
    }
}

/** Refresh once immediately, then every 12 hours without needing a restart. */
export function startAntigravityVersionSweeper(IntervalMs = SWEEP_INTERVAL_MS): void {
    if (sweepTimer) return;
    console.log(`[Antigravity] Starting version sweeper (every ${IntervalMs / 3_600_000}h)`);
    void refreshAntigravityCliVersion(true).then((Version) => {
        // Antigravity CLI version auto-updated (notification hidden on purpose)
        if (Version) {
            void Version;
        }
    });
    sweepTimer = setInterval(() => {
        void refreshAntigravityCliVersion(true).then((Version) => {
            // notification hidden on purpose (silently applied, see initial refresh above)
            void Version;
        });
    }, IntervalMs);
    sweepTimer.unref?.();
}

export function stopAntigravityVersionSweeper(): void {
    if (!sweepTimer) return;
    clearInterval(sweepTimer);
    sweepTimer = null;
}
