"use client";

import React, { useState, useMemo } from "react";
import { Plus, X, Award, ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import TagChip from "@/components/tags/tag-chip";
import type { ActivityListItem } from "@/lib/atproto/activity-types";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";

export interface ProjectCertItem {
  itemIdentifier: { uri: string; cid: string };
  itemWeight?: string;
}

export interface ProjectCertsProps {
  /** Current items (cert associations) on the project */
  items: ProjectCertItem[];
  /** All activities loaded from the user's repo */
  activities: ActivityListItem[];
  /** All tags for rendering tag chips */
  availableTags: WorkScopeTagListItem[];
  /** Whether the component is in edit mode (add/remove) or view mode (read-only) */
  mode: "edit" | "view";
  /** Called when items change (edit mode only) */
  onItemsChange?: (items: ProjectCertItem[]) => void;
  /** Whether activities are still loading */
  isLoading?: boolean;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

/** Resolve an AT URI to an ActivityListItem by matching uri */
function resolveActivity(
  uri: string,
  activities: ActivityListItem[]
): ActivityListItem | null {
  return activities.find((a) => a.uri === uri) ?? null;
}

/**
 * A compact cert card used in both edit and view modes.
 */
function CertMiniCard({
  activity,
  availableTags,
  onRemove,
}: {
  activity: ActivityListItem;
  availableTags: WorkScopeTagListItem[];
  onRemove?: () => void;
}) {
  const { value } = activity;
  const displayDescription = value.shortDescription || value.description || "";

  return (
    <div className="relative flex flex-col gap-2 bg-white border border-gray-200 rounded p-4 group">
      {/* Remove button (edit mode) */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors duration-150 rounded opacity-0 group-hover:opacity-100"
          aria-label={`Remove ${value.title}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Title */}
      <h4 className="font-mono text-sm font-semibold text-navy pr-8 leading-snug">
        {value.title}
      </h4>

      {/* Description */}
      {displayDescription && (
        <p className="text-xs text-gray-600 line-clamp-2">
          {displayDescription}
        </p>
      )}

      {/* Date range */}
      {(value.startDate || value.endDate) && (
        <p className="text-xs text-gray-500 font-mono">
          {value.startDate ? formatDate(value.startDate) : "..."}
          {" \u2192 "}
          {value.endDate ? formatDate(value.endDate) : "ongoing"}
        </p>
      )}

      {/* Tag chips (compact) */}
      {value.workScope?.labels && value.workScope.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.workScope.labels.slice(0, 5).map((key: string) => {
            const found = availableTags.find((t) => t.value.key === key);
            if (found) {
              return <TagChip key={key} tag={found} size="sm" />;
            }
            return (
              <span
                key={key}
                className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300"
              >
                {key}
              </span>
            );
          })}
          {value.workScope.labels.length > 5 && (
            <span className="text-xs text-gray-400">
              +{value.workScope.labels.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Cert picker modal — shows available certs that aren't already associated.
 */
function CertPickerModal({
  activities,
  existingUris,
  availableTags,
  onSelect,
  onClose,
}: {
  activities: ActivityListItem[];
  existingUris: Set<string>;
  availableTags: WorkScopeTagListItem[];
  onSelect: (activity: ActivityListItem) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const available = useMemo(() => {
    return activities.filter((a) => {
      if (existingUris.has(a.uri)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const title = a.value.title.toLowerCase();
        const desc = (a.value.shortDescription || a.value.description || "").toLowerCase();
        return title.includes(q) || desc.includes(q);
      }
      return true;
    });
  }, [activities, existingUris, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cert-picker-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div className="relative bg-white rounded border border-gray-200 shadow-elevation-3 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3
            id="cert-picker-title"
            className="font-mono text-sm font-semibold text-navy uppercase tracking-wider mb-3"
          >
            Add Cert to Project
          </h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certs..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-accent/50 bg-gray-50"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {available.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {activities.length === 0
                ? "No certs found. Create some certs first."
                : existingUris.size === activities.length
                ? "All certs are already associated with this project."
                : "No matching certs found."}
            </p>
          ) : (
            available.map((activity) => (
              <button
                key={activity.uri}
                type="button"
                onClick={() => onSelect(activity)}
                className="w-full text-left p-3 rounded border border-gray-200 hover:border-accent/40 hover:bg-accent/5 transition-colors duration-150"
              >
                <div className="font-mono text-sm font-semibold text-navy leading-snug">
                  {activity.value.title}
                </div>
                {(activity.value.shortDescription || activity.value.description) && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {activity.value.shortDescription || activity.value.description}
                  </p>
                )}
                {activity.value.workScope?.labels && activity.value.workScope.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {activity.value.workScope.labels.slice(0, 4).map((key: string) => {
                      const found = availableTags.find((t) => t.value.key === key);
                      if (found) {
                        return <TagChip key={key} tag={found} size="sm" />;
                      }
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300"
                        >
                          {key}
                        </span>
                      );
                    })}
                    {activity.value.workScope.labels.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{activity.value.workScope.labels.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * ProjectCerts — displays and manages cert associations on a project.
 *
 * In edit mode: shows associated certs with remove buttons + "Add Cert" button.
 * In view mode: shows associated certs as read-only cards.
 */
const ProjectCerts: React.FC<ProjectCertsProps> = ({
  items,
  activities,
  availableTags,
  mode,
  onItemsChange,
  isLoading = false,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Resolve items to activities
  const resolvedCerts = useMemo(() => {
    return items
      .map((item) => ({
        item,
        activity: resolveActivity(item.itemIdentifier.uri, activities),
      }))
      .filter(
        (entry): entry is { item: ProjectCertItem; activity: ActivityListItem } =>
          entry.activity !== null
      );
  }, [items, activities]);

  // URIs already associated
  const existingUris = useMemo(
    () => new Set(items.map((i) => i.itemIdentifier.uri)),
    [items]
  );

  const handleAddCert = (activity: ActivityListItem) => {
    if (!onItemsChange) return;
    const newItem: ProjectCertItem = {
      itemIdentifier: { uri: activity.uri, cid: activity.cid },
    };
    onItemsChange([...items, newItem]);
    setIsPickerOpen(false);
  };

  const handleRemoveCert = (uri: string) => {
    if (!onItemsChange) return;
    onItemsChange(items.filter((i) => i.itemIdentifier.uri !== uri));
  };

  // In view mode, if no certs, don't render anything
  if (mode === "view" && resolvedCerts.length === 0 && !isLoading) {
    return null;
  }

  const certCount = resolvedCerts.length;
  const unresolvedCount = items.length - resolvedCerts.length;

  return (
    <div className="mb-8">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-4 group w-full text-left"
      >
        <Award className="w-4 h-4 text-accent" />
        <h2 className="font-mono text-sm font-semibold text-navy uppercase tracking-wider">
          Certs of this project
        </h2>
        <span className="text-xs text-gray-400 font-mono">
          ({certCount})
        </span>
        {mode === "view" && (
          <span className="ml-auto">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </span>
        )}
      </button>

      {isExpanded && (
        <>
          {isLoading ? (
            <div className="text-sm text-gray-500 py-4">Loading certs...</div>
          ) : (
            <>
              {/* Cert cards */}
              {resolvedCerts.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {resolvedCerts.map(({ item, activity }) => (
                    <CertMiniCard
                      key={item.itemIdentifier.uri}
                      activity={activity}
                      availableTags={availableTags}
                      onRemove={
                        mode === "edit"
                          ? () => handleRemoveCert(item.itemIdentifier.uri)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}

              {/* Unresolved items notice */}
              {unresolvedCount > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {unresolvedCount} cert{unresolvedCount > 1 ? "s" : ""} could
                  not be resolved (may have been deleted).
                </p>
              )}

              {/* Empty state in edit mode */}
              {mode === "edit" && resolvedCerts.length === 0 && (
                <Card className="text-center py-6">
                  <Award className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">
                    No certs associated with this project yet.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsPickerOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Cert
                  </Button>
                </Card>
              )}

              {/* Add button (edit mode, when there are already certs) */}
              {mode === "edit" && resolvedCerts.length > 0 && (
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsPickerOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Cert
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Picker modal */}
          {isPickerOpen && (
            <CertPickerModal
              activities={activities}
              existingUris={existingUris}
              availableTags={availableTags}
              onSelect={handleAddCert}
              onClose={() => setIsPickerOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ProjectCerts;
