import { useState } from "react";
import { Download, FileJson, Loader2, Lock, Plus, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ModelObject } from "@codex/types";

interface ImportModelsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    providerName: string;
    providerId: string;
    existingModels: ModelObject[];
    availableModels?: ModelObject[];
    isFetching: boolean;
    isImporting: boolean;
    onFetchModels: () => void;
    onImport: (modelIds: string[]) => void;
}

export function ImportModelsDialog({
    open,
    onOpenChange,
    providerName,
    providerId,
    existingModels,
    availableModels = [],
    isFetching,
    isImporting,
    onFetchModels,
    onImport
}: ImportModelsDialogProps) {
    const [mode, setMode] = useState<"fetch" | "paste">("fetch");
    const [statusFilter, setStatusFilter] = useState<"all" | "unlocked" | "locked">("all");
    const [pasteText, setPasteText] = useState("");
    const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState("");

    const isAlreadyAvailable = (modelId: string) => {
        if (!availableModels || availableModels.length === 0) return false;
        const bareId = modelId.includes("/") ? modelId.split("/").slice(1).join("/") : modelId;
        const lowModel = modelId.toLowerCase();
        const lowBare = bareId.toLowerCase();
        return availableModels.some((am) => {
            const amId = am.id.toLowerCase();
            const amBare = am.id.includes("/") ? am.id.split("/").slice(1).join("/").toLowerCase() : amId;
            return (
                amId === lowModel ||
                amBare === lowBare ||
                amId.endsWith(`/${lowBare}`) ||
                lowModel.endsWith(`/${amBare}`) ||
                amId === lowBare ||
                amBare === lowModel
            );
        });
    };

    const isLockedModel = (model: ModelObject) => {
        return Boolean((model as ModelObject & { locked?: boolean }).locked);
    };

    const handlePasteImport = () => {
        const lockedIds = new Set(
            existingModels
                .filter(isLockedModel)
                .map((m) => m.id.toLowerCase())
        );
        const lines = pasteText
            .split(/[\n,]+/)
            .map((l) => l.trim())
            .filter((l) => {
                if (l.length === 0 || isAlreadyAvailable(l)) return false;
                const bare = l.includes("/") ? l.split("/").slice(1).join("/").toLowerCase() : l.toLowerCase();
                if (lockedIds.has(l.toLowerCase()) || lockedIds.has(bare)) return false;
                return true;
            });
        if (lines.length === 0) return;
        onImport(lines);
    };

    const handleFetchImport = () => {
        const models = Array.from(selectedModels);
        if (models.length === 0) return;
        onImport(models);
    };

    const toggleModel = (id: string) => {
        if (isAlreadyAvailable(id)) return;
        const target = existingModels.find((m) => m.id === id);
        if (target && isLockedModel(target)) return;

        setSelectedModels((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const getFilteredModels = () => {
        let models = existingModels;
        if (statusFilter === "unlocked") {
            models = models.filter((m) => !isLockedModel(m));
        } else if (statusFilter === "locked") {
            models = models.filter(isLockedModel);
        }

        if (!filter) return models;
        const lower = filter.toLowerCase();
        return models.filter(
            (m) =>
                m.id.toLowerCase().includes(lower) ||
                m.name?.toLowerCase().includes(lower) ||
                m.owned_by?.toLowerCase().includes(lower)
        );
    };

    const filteredModels = getFilteredModels();

    const selectAll = () => {
        const toSelect = filteredModels
            .filter((m) => !isAlreadyAvailable(m.id) && !isLockedModel(m))
            .map((m) => m.id);
        setSelectedModels(new Set(toSelect));
    };

    const deselectAll = () => {
        setSelectedModels(new Set());
    };

    const totalCount = existingModels.length;
    const unlockedCount = existingModels.filter((m) => !isLockedModel(m)).length;
    const lockedCount = existingModels.filter(isLockedModel).length;

    const pasteCount = pasteText
        .split(/[\n,]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0).length;

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                onOpenChange(v);
                if (!v) {
                    setPasteText("");
                    setSelectedModels(new Set());
                    setFilter("");
                    setStatusFilter("all");
                }
            }}
        >
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90dvh] sm:max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
                    <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                        <Download className="size-4 text-emerald-500" />
                        <span className="truncate">Import to {providerName}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Fetch from provider API or paste model IDs manually. Locked models cannot be added.
                    </DialogDescription>
                </DialogHeader>

                {/* Mode Segmented Control */}
                <div className="mx-4 sm:mx-6 mb-3">
                    <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
                        <button
                            type="button"
                            onClick={() => setMode("fetch")}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                                mode === "fetch"
                                    ? "bg-background text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Search className="size-3.5" />
                            <span>Fetch</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("paste")}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                                mode === "paste"
                                    ? "bg-background text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <FileJson className="size-3.5" />
                            <span>Paste IDs</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6">
                    {mode === "fetch" ? (
                        <div className="flex flex-col gap-3 pb-4">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onFetchModels}
                                disabled={isFetching}
                                className="w-full h-10 text-xs font-semibold cursor-pointer gap-1.5"
                            >
                                {isFetching ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Search className="size-4" />
                                )}
                                <span>{isFetching ? "Fetching..." : "Fetch Available Models"}</span>
                            </Button>

                            {existingModels.length > 0 && (
                                <>
                                    {/* Status Filter Tabs */}
                                    <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/30 border border-border/50 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter("all")}
                                            className={`flex-1 py-1 px-2 rounded font-medium transition-all cursor-pointer text-center ${
                                                statusFilter === "all"
                                                    ? "bg-background text-foreground shadow-2xs font-semibold"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            All ({totalCount})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter("unlocked")}
                                            className={`flex-1 py-1 px-2 rounded font-medium transition-all cursor-pointer text-center inline-flex items-center justify-center gap-1 ${
                                                statusFilter === "unlocked"
                                                    ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <ShieldCheck className="size-3 text-emerald-500" />
                                            <span>Unlocked ({unlockedCount})</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter("locked")}
                                            className={`flex-1 py-1 px-2 rounded font-medium transition-all cursor-pointer text-center inline-flex items-center justify-center gap-1 ${
                                                statusFilter === "locked"
                                                    ? "bg-background text-amber-600 dark:text-amber-400 shadow-2xs font-semibold"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <Lock className="size-3 text-amber-500" />
                                            <span>Locked ({lockedCount})</span>
                                        </button>
                                    </div>

                                    {/* Search + Actions row */}
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Filter models..."
                                                value={filter}
                                                onChange={(e) => setFilter(e.target.value)}
                                                className="h-9 pl-8 text-xs"
                                            />
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={selectAll}
                                                className="h-9 px-3 text-[11px] font-semibold cursor-pointer"
                                                title="Select all unlocked models"
                                            >
                                                Select All
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={deselectAll}
                                                className="h-9 px-3 text-[11px] font-semibold cursor-pointer"
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Model list */}
                                    <div className="rounded-lg border border-border/70 bg-muted/20 divide-y divide-border/40 max-h-[320px] overflow-y-auto">
                                        {filteredModels.map((m) => {
                                            const isAvailable = isAlreadyAvailable(m.id);
                                            const isLocked = isLockedModel(m);
                                            const cannotAdd = isAvailable || isLocked;
                                            const isSelected = selectedModels.has(m.id);
                                            return (
                                                <label
                                                    key={m.id}
                                                    className={`flex items-center gap-3 px-3 py-2 text-xs font-mono transition-colors min-h-[44px] ${
                                                        isAvailable
                                                            ? "opacity-50 cursor-not-allowed bg-muted/10 text-muted-foreground"
                                                            : isLocked
                                                            ? "opacity-60 cursor-not-allowed bg-amber-500/5 text-muted-foreground border-l-2 border-l-amber-500/50"
                                                            : isSelected
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                                                            : "hover:bg-muted/40 active:bg-muted/60 text-foreground cursor-pointer"
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={cannotAdd}
                                                        onChange={() => !cannotAdd && toggleModel(m.id)}
                                                        className="size-4 shrink-0 rounded border-border accent-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    />
                                                    <div className="truncate flex-1 min-w-0 flex flex-col justify-center">
                                                        <span className="truncate font-semibold">{m.id}</span>
                                                        {m.name && m.name !== m.id && (
                                                            <span className="truncate text-[10.5px] font-sans text-muted-foreground">
                                                                {m.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isAvailable ? (
                                                        <span className="shrink-0 text-[10px] font-sans px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                                                            Already available
                                                        </span>
                                                    ) : isLocked ? (
                                                        <span className="shrink-0 text-[10px] font-sans px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1 font-semibold" title="Model locked by provider - paid plan required">
                                                            <Lock className="size-2.5" />
                                                            <span>Locked</span>
                                                        </span>
                                                    ) : null}
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {(() => {
                                        const alreadyCount = filteredModels.filter((m) => isAlreadyAvailable(m.id)).length;
                                        const lockedInFiltered = filteredModels.filter((m) => !isAlreadyAvailable(m.id) && isLockedModel(m)).length;
                                        const addableInFiltered = filteredModels.filter((m) => !isAlreadyAvailable(m.id) && !isLockedModel(m)).length;
                                        return (
                                            <p className="text-[11px] text-muted-foreground text-center">
                                                {selectedModels.size} selected to import · {addableInFiltered} can be added
                                                {lockedInFiltered > 0 ? ` · ${lockedInFiltered} locked (cannot add)` : ""}
                                                {alreadyCount > 0 ? ` (${alreadyCount} already available)` : ""}
                                            </p>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 pb-4">
                            <textarea
                                rows={6}
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                placeholder={"Model IDs, one per line or comma-separated:\n\ngpt-4o\ngpt-4o-mini\nclaude-sonnet-4-20250514"}
                                className="w-full rounded-lg border border-border/80 bg-muted/20 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none min-h-[120px]"
                            />
                            <p className="text-[11px] text-muted-foreground text-center">
                                {pasteCount} model{pasteCount !== 1 ? "s" : ""} detected
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-4 pb-4 pt-2 sm:px-6 sm:pb-5 border-t border-border/50">
                    <div className="flex w-full gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-10 cursor-pointer"
                        >
                            Cancel
                        </Button>
                        {mode === "fetch" ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleFetchImport}
                                disabled={selectedModels.size === 0 || isImporting}
                                className="flex-1 h-10 font-semibold gap-1.5 cursor-pointer"
                            >
                                {isImporting ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Plus className="size-4" />
                                )}
                                <span>
                                    Import{selectedModels.size > 0 ? ` ${selectedModels.size}` : ""}
                                </span>
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handlePasteImport}
                                disabled={pasteCount === 0 || isImporting}
                                className="flex-1 h-10 font-semibold gap-1.5 cursor-pointer"
                            >
                                {isImporting ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Plus className="size-4" />
                                )}
                                <span>Import</span>
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
