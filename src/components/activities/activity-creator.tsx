"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useWorkScopeTags } from "@/hooks/use-work-scope-tags";
import {
  createActivity,
  updateActivity,
  getActivity,
} from "@/lib/atproto/activities";
import type { ActivityRecord } from "@/lib/atproto/activity-types";
import {
  buildCelExpression,
  parseTagKeysFromExpression,
  type TagSelection,
} from "@/lib/cel/expression-builder";
import AuthGuard from "@/components/layout/auth-guard";
import { TagSuggestionPanel } from "@/components/activities/tag-suggestion-panel";
import { CelPreview } from "@/components/activities/cel-preview";
import Button from "@/components/ui/button";

interface Suggestion {
  key: string;
  confidence: number;
  reason: string;
}

function ActivityCreatorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRkey = searchParams.get("edit");
  const isEditMode = !!editRkey;

  const { agent, did } = useAuth();
  const { tags } = useWorkScopeTags();

  // Form state
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
  const [excludedTagKeys, setExcludedTagKeys] = useState<string[]>([]);

  // Edit state
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string>("");
  const [originalWorkScopeCreatedAt, setOriginalWorkScopeCreatedAt] =
    useState<string>("");

  // AI suggestion state
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Load existing activity for edit mode
  useEffect(() => {
    if (!editRkey || !agent || !did) return;
    let cancelled = false;
    setIsLoadingEdit(true);

    (async () => {
      try {
        const activity = await getActivity(agent, did, editRkey);
        if (cancelled || !activity) return;

        setTitle(activity.title);
        setShortDescription(activity.shortDescription);
        setDescription(activity.description ?? "");
        setStartDate(activity.startDate ? activity.startDate.slice(0, 10) : "");
        setEndDate(activity.endDate ? activity.endDate.slice(0, 10) : "");
        setOriginalCreatedAt(activity.createdAt);
        setOriginalWorkScopeCreatedAt(activity.workScope?.createdAt ?? "");

        // Restore tag selections from the expression
        const labels = activity.workScope?.labels ?? [];
        setSelectedTagKeys(labels);

        // Try to parse excluded tags from expression (look for !scope.has patterns)
        const expr = activity.workScope?.expression ?? "";
        const excludeRe = /!scope\.has\("([^"]+)"\)/g;
        const excluded: string[] = [];
        let exMatch: RegExpExecArray | null;
        while ((exMatch = excludeRe.exec(expr)) !== null) {
          excluded.push(exMatch[1]);
        }
        setExcludedTagKeys(excluded);
      } catch (err) {
        console.error("Failed to load activity for editing:", err);
      } finally {
        if (!cancelled) setIsLoadingEdit(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editRkey, agent, did]);

  // Compute CEL expression live: selected = any_of, excluded = exclude
  const celExpression = useMemo(() => {
    if (selectedTagKeys.length === 0 && excludedTagKeys.length === 0) return "";
    const selections: TagSelection[] = [
      ...selectedTagKeys.map((key) => ({ key, mode: "any_of" as const })),
      ...excludedTagKeys.map((key) => ({ key, mode: "exclude" as const })),
    ];
    return buildCelExpression(selections);
  }, [selectedTagKeys, excludedTagKeys]);

  const handleSuggest = useCallback(async () => {
    if (!title.trim() || !shortDescription.trim()) return;

    setIsLoadingSuggestions(true);
    setSuggestError(null);

    try {
      const availableTags = tags.map((t) => ({
        key: t.value.key,
        label: t.value.label,
        kind: t.value.kind,
        description: t.value.description,
      }));

      const res = await fetch("/api/suggest-work-scopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: shortDescription,
          availableTags,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }

      const data = await res.json();
      const suggestedTags: Suggestion[] = data.suggestedTags ?? [];
      setSuggestions(suggestedTags);

      // Pre-select tags with confidence >= 0.5
      const highConfidenceKeys = suggestedTags
        .filter((s) => s.confidence >= 0.5)
        .map((s) => s.key);

      setSelectedTagKeys((prev) => {
        const combined = new Set([...prev, ...highConfidenceKeys]);
        return Array.from(combined);
      });
    } catch (err) {
      setSuggestError(
        err instanceof Error ? err.message : "Failed to get suggestions",
      );
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [title, shortDescription, tags]);

  const handlePublish = useCallback(async () => {
    if (!agent || !did) return;
    if (
      !title.trim() ||
      !shortDescription.trim() ||
      selectedTagKeys.length === 0
    )
      return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const now = new Date().toISOString();

      const record: Omit<ActivityRecord, "$type" | "createdAt"> = {
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        workScope: {
          expression: celExpression,
          labels: selectedTagKeys,
          version: "v1",
          createdAt: originalWorkScopeCreatedAt || now,
        },
      };

      if (isEditMode && editRkey) {
        await updateActivity(agent, did, editRkey, {
          ...record,
          createdAt: originalCreatedAt || now,
        });
      } else {
        await createActivity(agent, did, record);
      }

      router.push("/certs");
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Failed to publish cert",
      );
    } finally {
      setIsPublishing(false);
    }
  }, [
    agent,
    did,
    title,
    shortDescription,
    description,
    startDate,
    endDate,
    selectedTagKeys,
    celExpression,
    isEditMode,
    editRkey,
    originalCreatedAt,
    originalWorkScopeCreatedAt,
    router,
  ]);

  const canSuggest =
    title.trim().length > 0 && shortDescription.trim().length > 0;
  const canPublish =
    title.trim().length > 0 &&
    shortDescription.trim().length > 0 &&
    selectedTagKeys.length > 0;

  if (isLoadingEdit) {
    return (
      <div className="app-page">
        <div className="app-page__inner flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="app-page__inner">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          {/* Page heading */}
          <div>
            <h1 className="text-2xl font-mono font-bold text-[var(--color-navy)] uppercase tracking-tight">
              {isEditMode ? "Edit Cert" : "New Cert"}
            </h1>
            <p className="text-sm text-[var(--color-mid-gray)] mt-1">
              {isEditMode
                ? "Update the cert details and work scope tags."
                : "Describe your work and let AI suggest the right work scope tags."}
            </p>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="activity-title"
              className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]"
            >
              Title <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="activity-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mangrove restoration survey Q1 2026"
              maxLength={256}
              className="w-full border border-[var(--color-light-gray)] rounded-lg px-4 py-2.5 text-sm font-mono text-[var(--color-navy)] bg-white placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors duration-150"
            />
          </div>

          {/* Short Description */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="activity-short-description"
              className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]"
            >
              Short Description{" "}
              <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              id="activity-short-description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief summary of the work being done..."
              rows={3}
              maxLength={3000}
              className="w-full border border-[var(--color-light-gray)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-dark-gray)] bg-white placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors duration-150 resize-none"
            />
            <p className="text-[10px] text-[var(--color-mid-gray)] font-mono">
              {shortDescription.length}/300 graphemes
            </p>
          </div>

          {/* Description (optional, longer) */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="activity-description"
              className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]"
            >
              Description (optional)
            </label>
            <textarea
              id="activity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Longer description with context, methodology, interpretation..."
              rows={4}
              maxLength={30000}
              className="w-full border border-[var(--color-light-gray)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-dark-gray)] bg-white placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors duration-150 resize-y"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="activity-start-date"
                className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]"
              >
                Start Date
              </label>
              <input
                id="activity-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-[var(--color-light-gray)] rounded-lg px-4 py-2.5 text-sm font-mono text-[var(--color-navy)] bg-white focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors duration-150"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="activity-end-date"
                className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]"
              >
                End Date
              </label>
              <input
                id="activity-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-[var(--color-light-gray)] rounded-lg px-4 py-2.5 text-sm font-mono text-[var(--color-navy)] bg-white focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors duration-150"
              />
            </div>
          </div>

          {/* Suggest button */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSuggest}
              disabled={!canSuggest || isLoadingSuggestions}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-150 ${
                canSuggest && !isLoadingSuggestions
                  ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-deep-blue)] text-white shadow-md hover:opacity-90 cursor-pointer"
                  : "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)] cursor-not-allowed opacity-60"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isLoadingSuggestions ? "Analyzing..." : "Suggest Work Scopes"}
            </button>
            {suggestError && (
              <p className="text-xs text-[var(--color-error)] font-mono">
                {suggestError}
              </p>
            )}
          </div>

          {/* Tag suggestion panel */}
          {tags.length > 0 && (
            <div className="app-card">
              <TagSuggestionPanel
                availableTags={tags}
                selectedTagKeys={selectedTagKeys}
                excludedTagKeys={excludedTagKeys}
                onSelectionChange={setSelectedTagKeys}
                onExcludedChange={setExcludedTagKeys}
                suggestions={suggestions}
                isLoadingSuggestions={isLoadingSuggestions}
              />
            </div>
          )}

          {/* CEL preview */}
          <div className="app-card">
            <CelPreview expression={celExpression} tagKeys={selectedTagKeys} />
          </div>

          {/* Publish */}
          <div className="flex flex-col gap-2">
            {publishError && (
              <p className="text-sm text-[var(--color-error)] bg-red-50 border border-red-200 rounded px-4 py-3 font-mono">
                {publishError}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handlePublish}
                disabled={!canPublish || isPublishing}
                loading={isPublishing}
                type="button"
              >
                {isEditMode ? "Save Changes" : "Publish Cert"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivityCreator() {
  return (
    <AuthGuard>
      <React.Suspense
        fallback={
          <div className="app-page">
            <div className="app-page__inner flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        }
      >
        <ActivityCreatorForm />
      </React.Suspense>
    </AuthGuard>
  );
}

export default ActivityCreator;
