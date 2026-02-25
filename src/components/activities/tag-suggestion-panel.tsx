"use client";

import React from "react";
import { Check, X, Sparkles } from "lucide-react";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";
import { WORK_SCOPE_TAG_KINDS } from "@/lib/atproto/work-scope-types";
import type { ExpressionMode } from "@/lib/cel/expression-builder";

export interface TagSuggestionPanelProps {
  availableTags: WorkScopeTagListItem[];
  selectedTagKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  tagModes: Record<string, ExpressionMode>;
  onModeChange: (key: string, mode: ExpressionMode) => void;
  suggestions: { key: string; confidence: number; reason: string }[] | null;
  isLoadingSuggestions: boolean;
}

const MODE_LABELS: { mode: ExpressionMode; label: string }[] = [
  { mode: "must_have_all", label: "MUST" },
  { mode: "any_of", label: "ANY" },
  { mode: "exclude", label: "EXCLUDE" },
];

/** Color for confidence badge */
function confidenceColor(pct: number): string {
  if (pct >= 80) return "bg-green-100 text-green-700 border-green-300";
  if (pct >= 60) return "bg-yellow-100 text-yellow-700 border-yellow-300";
  return "bg-orange-100 text-orange-700 border-orange-300";
}

/** Kind color for selected tag cards */
const KIND_ACCENT: Record<string, string> = {
  topic: "border-l-emerald-500",
  language: "border-l-cyan-500",
  domain: "border-l-purple-500",
  method: "border-l-blue-500",
  tag: "border-l-amber-500",
};

export function TagSuggestionPanel({
  availableTags,
  selectedTagKeys,
  onSelectionChange,
  tagModes,
  onModeChange,
  suggestions,
  isLoadingSuggestions,
}: TagSuggestionPanelProps) {
  const suggestionMap = React.useMemo(() => {
    if (!suggestions)
      return new Map<string, { confidence: number; reason: string }>();
    return new Map(suggestions.map((s) => [s.key, s]));
  }, [suggestions]);

  const handleToggle = (key: string) => {
    if (selectedTagKeys.includes(key)) {
      onSelectionChange(selectedTagKeys.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedTagKeys, key]);
    }
  };

  const handleRemove = (key: string) => {
    onSelectionChange(selectedTagKeys.filter((k) => k !== key));
  };

  // Group tags by kind
  const tagsByKind = React.useMemo(() => {
    const map = new Map<string, WorkScopeTagListItem[]>();
    for (const kind of WORK_SCOPE_TAG_KINDS) {
      map.set(kind, []);
    }
    for (const tag of availableTags) {
      const kind = tag.value.kind ?? "topic";
      if (!map.has(kind)) map.set(kind, []);
      map.get(kind)!.push(tag);
    }
    return map;
  }, [availableTags]);

  const selectedTags = availableTags.filter((t) =>
    selectedTagKeys.includes(t.value.key),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* AI suggestion loading skeleton */}
      {isLoadingSuggestions && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-blue-600 font-mono font-medium">
            AI is analyzing your description...
          </span>
        </div>
      )}

      {/* ── SELECTED TAGS SUMMARY ── */}
      {selectedTags.length > 0 && (
        <div className="rounded-lg border-2 border-[var(--color-accent)] bg-[rgba(96,161,226,0.04)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-mono font-semibold text-[var(--color-navy)] uppercase tracking-wider">
                {selectedTagKeys.length} tag
                {selectedTagKeys.length !== 1 ? "s" : ""} selected
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {selectedTags.map((tag) => {
              const suggestion = suggestionMap.get(tag.value.key);
              const confidencePct = suggestion
                ? Math.round(suggestion.confidence * 100)
                : null;
              const currentMode = tagModes[tag.value.key] ?? "must_have_all";
              const kindAccent =
                KIND_ACCENT[tag.value.kind ?? "topic"] ?? "border-l-gray-400";

              return (
                <div
                  key={tag.value.key}
                  className={`flex items-center gap-3 bg-white rounded-lg border border-[rgba(15,37,68,0.12)] border-l-4 ${kindAccent} px-3 py-2.5 shadow-sm`}
                >
                  {/* Tag info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-navy)]">
                        {tag.value.label}
                      </span>
                      <code className="text-[10px] font-mono text-[var(--color-mid-gray)] bg-gray-100 px-1.5 py-0.5 rounded">
                        {tag.value.key}
                      </code>
                      {/* Confidence badge */}
                      {confidencePct !== null && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold border rounded-full px-2 py-0.5 ${confidenceColor(confidencePct)}`}
                          title={suggestion?.reason}
                        >
                          <Sparkles className="w-3 h-3" />
                          {confidencePct}%
                        </span>
                      )}
                    </div>
                    {/* Suggestion reason */}
                    {suggestion?.reason && (
                      <p className="text-[11px] text-[var(--color-mid-gray)] mt-0.5 leading-snug">
                        {suggestion.reason}
                      </p>
                    )}
                  </div>

                  {/* Mode toggles */}
                  <div className="flex gap-1 flex-shrink-0">
                    {MODE_LABELS.map(({ mode, label }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onModeChange(tag.value.key, mode)}
                        className={`text-[10px] border rounded px-1.5 py-0.5 font-mono font-bold transition-colors duration-150 ${
                          currentMode === mode
                            ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                            : "bg-transparent text-[var(--color-mid-gray)] border-[var(--color-light-gray)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(tag.value.key)}
                    className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                    aria-label={`Remove ${tag.value.label}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty selection hint */}
      {selectedTags.length === 0 && !isLoadingSuggestions && (
        <div className="text-xs font-mono text-[var(--color-mid-gray)] uppercase tracking-wider">
          Click tags below to select them
        </div>
      )}

      {/* ── ALL TAGS (grouped by kind) ── */}
      <div className="flex flex-col gap-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]">
          Available tags
        </div>
        {WORK_SCOPE_TAG_KINDS.map((kind) => {
          const tags = tagsByKind.get(kind) ?? [];
          if (tags.length === 0) return null;
          return (
            <div key={kind}>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] mb-2">
                {kind}
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedTagKeys.includes(tag.value.key);
                  const suggestion = suggestionMap.get(tag.value.key);
                  const confidencePct = suggestion
                    ? Math.round(suggestion.confidence * 100)
                    : null;

                  return (
                    <button
                      key={tag.value.key}
                      type="button"
                      onClick={() => handleToggle(tag.value.key)}
                      className={`group relative inline-flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                        isSelected
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm ring-2 ring-[var(--color-accent)]/30"
                          : suggestion
                            ? "bg-white text-[var(--color-navy)] border-[var(--color-accent)]/40 hover:border-[var(--color-accent)] hover:bg-[rgba(96,161,226,0.06)] ring-1 ring-[var(--color-accent)]/20"
                            : "bg-white text-[var(--color-dark-gray)] border-[rgba(15,37,68,0.15)] hover:border-[rgba(15,37,68,0.3)] hover:bg-[var(--color-off-white)]"
                      }`}
                    >
                      {/* Checkmark for selected */}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      {/* AI sparkle for suggested but not selected */}
                      {!isSelected && suggestion && (
                        <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0" />
                      )}
                      <span>{tag.value.label}</span>
                      {/* Confidence inline */}
                      {confidencePct !== null && !isSelected && (
                        <span className="text-[10px] font-mono font-bold opacity-70">
                          {confidencePct}%
                        </span>
                      )}
                      {confidencePct !== null && isSelected && (
                        <span className="text-[10px] font-mono font-bold text-white/80">
                          {confidencePct}%
                        </span>
                      )}
                      {/* Tooltip */}
                      {suggestion && (
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 hidden group-hover:block w-52 bg-[var(--color-navy)] text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none text-center leading-snug">
                          {suggestion.reason}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TagSuggestionPanel;
