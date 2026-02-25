"use client";

import React, { useState } from "react";
import { Check, X, Sparkles, Plus, ChevronDown, ChevronRight, ShieldMinus } from "lucide-react";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";
import { WORK_SCOPE_TAG_KINDS } from "@/lib/atproto/work-scope-types";

export interface TagSuggestionPanelProps {
  availableTags: WorkScopeTagListItem[];
  selectedTagKeys: string[];
  excludedTagKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  onExcludedChange: (keys: string[]) => void;
  suggestions: { key: string; confidence: number; reason: string }[] | null;
  isLoadingSuggestions: boolean;
}

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
  excludedTagKeys,
  onSelectionChange,
  onExcludedChange,
  suggestions,
  isLoadingSuggestions,
}: TagSuggestionPanelProps) {
  const [addTagsOpen, setAddTagsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const suggestionMap = React.useMemo(() => {
    if (!suggestions)
      return new Map<string, { confidence: number; reason: string }>();
    return new Map(suggestions.map((s) => [s.key, s]));
  }, [suggestions]);

  const handleSelect = (key: string) => {
    if (!selectedTagKeys.includes(key)) {
      onSelectionChange([...selectedTagKeys, key]);
    }
    // Also remove from excluded if it was there
    if (excludedTagKeys.includes(key)) {
      onExcludedChange(excludedTagKeys.filter((k) => k !== key));
    }
  };

  const handleRemove = (key: string) => {
    onSelectionChange(selectedTagKeys.filter((k) => k !== key));
  };

  const handleExclude = (key: string) => {
    if (!excludedTagKeys.includes(key)) {
      onExcludedChange([...excludedTagKeys, key]);
    }
    // Also remove from selected if it was there
    if (selectedTagKeys.includes(key)) {
      onSelectionChange(selectedTagKeys.filter((k) => k !== key));
    }
  };

  const handleRemoveExclude = (key: string) => {
    onExcludedChange(excludedTagKeys.filter((k) => k !== key));
  };

  // Tags not yet selected or excluded — available for adding
  const unselectedTags = React.useMemo(() => {
    const usedKeys = new Set([...selectedTagKeys, ...excludedTagKeys]);
    return availableTags.filter((t) => !usedKeys.has(t.value.key));
  }, [availableTags, selectedTagKeys, excludedTagKeys]);

  // Tags not excluded — available for excluding (unselected only)
  const excludableTags = React.useMemo(() => {
    const usedKeys = new Set([...selectedTagKeys, ...excludedTagKeys]);
    return availableTags.filter((t) => !usedKeys.has(t.value.key));
  }, [availableTags, selectedTagKeys, excludedTagKeys]);

  // Group unselected tags by kind
  const unselectedByKind = React.useMemo(() => {
    const map = new Map<string, WorkScopeTagListItem[]>();
    for (const kind of WORK_SCOPE_TAG_KINDS) {
      map.set(kind, []);
    }
    for (const tag of unselectedTags) {
      const kind = tag.value.kind ?? "topic";
      if (!map.has(kind)) map.set(kind, []);
      map.get(kind)!.push(tag);
    }
    return map;
  }, [unselectedTags]);

  // Group excludable tags by kind
  const excludableByKind = React.useMemo(() => {
    const map = new Map<string, WorkScopeTagListItem[]>();
    for (const kind of WORK_SCOPE_TAG_KINDS) {
      map.set(kind, []);
    }
    for (const tag of excludableTags) {
      const kind = tag.value.kind ?? "topic";
      if (!map.has(kind)) map.set(kind, []);
      map.get(kind)!.push(tag);
    }
    return map;
  }, [excludableTags]);

  const selectedTags = availableTags.filter((t) =>
    selectedTagKeys.includes(t.value.key),
  );

  const excludedTags = availableTags.filter((t) =>
    excludedTagKeys.includes(t.value.key),
  );

  const hasUnselectedTags = unselectedTags.length > 0;
  const hasExcludableTags = excludableTags.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* AI suggestion loading */}
      {isLoadingSuggestions && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-blue-600 font-mono font-medium">
            AI is analyzing your description...
          </span>
        </div>
      )}

      {/* ── SELECTED TAGS ── */}
      {selectedTags.length > 0 ? (
        <div className="rounded-lg border-2 border-[var(--color-accent)] bg-[rgba(96,161,226,0.04)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-mono font-semibold text-[var(--color-navy)] uppercase tracking-wider">
              {selectedTagKeys.length} tag
              {selectedTagKeys.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {selectedTags.map((tag) => {
              const suggestion = suggestionMap.get(tag.value.key);
              const confidencePct = suggestion
                ? Math.round(suggestion.confidence * 100)
                : null;
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
                    {suggestion?.reason && (
                      <p className="text-[11px] text-[var(--color-mid-gray)] mt-0.5 leading-snug">
                        {suggestion.reason}
                      </p>
                    )}
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
      ) : (
        !isLoadingSuggestions && (
          <div className="text-xs font-mono text-[var(--color-mid-gray)] uppercase tracking-wider">
            No tags selected yet
          </div>
        )
      )}

      {/* ── ADD ADDITIONAL TAGS ── */}
      {hasUnselectedTags && (
        <div>
          <button
            type="button"
            onClick={() => setAddTagsOpen(!addTagsOpen)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-medium text-[var(--color-accent)] bg-[rgba(96,161,226,0.08)] border border-[var(--color-accent)]/25 rounded-lg hover:bg-[rgba(96,161,226,0.14)] hover:border-[var(--color-accent)]/40 transition-colors duration-150"
          >
            {addTagsOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {addTagsOpen ? "Hide tags" : "Add additional tags"}
          </button>

          {addTagsOpen && (
            <div className="mt-3 rounded-lg border border-[rgba(15,37,68,0.1)] bg-white p-4 flex flex-col gap-4">
              {WORK_SCOPE_TAG_KINDS.map((kind) => {
                const tags = unselectedByKind.get(kind) ?? [];
                if (tags.length === 0) return null;
                return (
                  <div key={kind}>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] mb-2">
                      {kind}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const suggestion = suggestionMap.get(tag.value.key);
                        const confidencePct = suggestion
                          ? Math.round(suggestion.confidence * 100)
                          : null;

                        return (
                          <button
                            key={tag.value.key}
                            type="button"
                            onClick={() => handleSelect(tag.value.key)}
                            className={`group relative inline-flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                              suggestion
                                ? "bg-white text-[var(--color-navy)] border-[var(--color-accent)]/40 hover:border-[var(--color-accent)] hover:bg-[rgba(96,161,226,0.06)] ring-1 ring-[var(--color-accent)]/20"
                                : "bg-white text-[var(--color-dark-gray)] border-[rgba(15,37,68,0.15)] hover:border-[rgba(15,37,68,0.3)] hover:bg-[var(--color-off-white)]"
                            }`}
                          >
                            {suggestion && (
                              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0" />
                            )}
                            <span>{tag.value.label}</span>
                            {confidencePct !== null && (
                              <span className="text-[10px] font-mono font-bold opacity-70">
                                {confidencePct}%
                              </span>
                            )}
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
          )}
        </div>
      )}

      {/* ── ADVANCED: EXCLUDE TAGS ── */}
      <div className="border-t border-[var(--color-light-gray)] pt-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--color-mid-gray)] hover:text-[var(--color-navy)] transition-colors duration-150"
        >
          {advancedOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          <span className="uppercase tracking-wider">Advanced</span>
        </button>

        {advancedOpen && (
          <div className="mt-3 flex flex-col gap-4">
            {/* Currently excluded tags */}
            {excludedTags.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldMinus className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-mono font-semibold text-red-700 uppercase tracking-wider">
                    {excludedTagKeys.length} tag
                    {excludedTagKeys.length !== 1 ? "s" : ""} excluded
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {excludedTags.map((tag) => (
                    <span
                      key={tag.value.key}
                      className="inline-flex items-center gap-1.5 border border-red-300 bg-white rounded-full px-3 py-1 text-sm font-medium text-red-700 line-through decoration-red-400"
                    >
                      {tag.value.label}
                      <button
                        type="button"
                        onClick={() => handleRemoveExclude(tag.value.key)}
                        className="p-0.5 rounded-full text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors duration-150"
                        aria-label={`Remove exclusion for ${tag.value.label}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags available to exclude */}
            {hasExcludableTags ? (
              <div className="rounded-lg border border-[rgba(15,37,68,0.1)] bg-white p-4 flex flex-col gap-4">
                <p className="text-xs text-[var(--color-mid-gray)]">
                  Click a tag to exclude it from the work scope expression.
                  Excluded tags will generate <code className="font-mono bg-gray-100 px-1 rounded">!scope.has(&quot;...&quot;)</code> conditions.
                </p>
                {WORK_SCOPE_TAG_KINDS.map((kind) => {
                  const tags = excludableByKind.get(kind) ?? [];
                  if (tags.length === 0) return null;
                  return (
                    <div key={kind}>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] mb-2">
                        {kind}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button
                            key={tag.value.key}
                            type="button"
                            onClick={() => handleExclude(tag.value.key)}
                            className="inline-flex items-center gap-1.5 border border-[rgba(15,37,68,0.15)] rounded-full px-3 py-1.5 text-sm font-medium text-[var(--color-dark-gray)] bg-white hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-all duration-150"
                          >
                            <ShieldMinus className="w-3.5 h-3.5 opacity-50" />
                            {tag.value.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--color-mid-gray)] italic">
                All tags are already selected or excluded.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TagSuggestionPanel;
