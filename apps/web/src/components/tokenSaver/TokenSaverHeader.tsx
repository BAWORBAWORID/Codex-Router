import { Coins } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface TokenSaverHeaderProps {
    enabled?: boolean;
    isAnyRuleActive?: boolean;
    saving?: boolean;
    onToggle?: (enabled: boolean) => void;
}

export function TokenSaverHeader({
    enabled = true,
    isAnyRuleActive = false,
    saving = false,
    onToggle
}: TokenSaverHeaderProps) {
    const isEffectivelyActive = enabled && isAnyRuleActive;

    return (
        <header className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="flex size-7 items-center justify-center rounded-md border border-border/70 bg-secondary/60 text-foreground">
                            <Coins className="size-3.5" />
                        </div>
                        <h1 className="text-base font-bold tracking-tight text-foreground">
                            Token Saver Engine
                        </h1>
                        <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                !enabled
                                    ? "border-muted-foreground/30 bg-secondary text-muted-foreground"
                                    : isEffectivelyActive
                                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                                      : "border-amber-500/40 bg-amber-500/10 text-amber-500"
                            }`}
                        >
                            {!enabled
                                ? "BYPASSED"
                                : isEffectivelyActive
                                  ? "ACTIVE"
                                  : "STANDBY (0 RULES)"}
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                        Autonomous proxy layer for multi-stage token reduction. Minifies heavy terminal
                        tool outputs (<code>git/grep/ls/logs</code>), injects lean YAGNI stdlib
                        principles, and eliminates repetitive LLM pleasantries.
                    </p>
                </div>

                {onToggle && (
                    <div className="flex items-center gap-3 self-start sm:self-center shrink-0 rounded-lg border border-border/70 bg-secondary/30 px-3.5 py-2.5">
                        <div className="text-right">
                            <div className="text-xs font-semibold text-foreground">Master Switch</div>
                            <div className="text-[10px] text-muted-foreground">
                                {enabled ? "Engine Enabled" : "Engine Bypassed"}
                            </div>
                        </div>
                        <Switch
                            checked={enabled}
                            onCheckedChange={onToggle}
                            disabled={saving}
                        />
                    </div>
                )}
            </div>
        </header>
    );
}
