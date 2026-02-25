"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import type {
  WorkScopeTagRecord,
  WorkScopeTagListItem,
  StrongRef,
} from "@/lib/atproto/work-scope-types";
import { WORK_SCOPE_TAG_KINDS } from "@/lib/atproto/work-scope-types";

export interface TagFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    tag: Omit<WorkScopeTagRecord, "$type" | "createdAt">,
  ) => Promise<void>;
  existingKeys: string[];
  /** All existing tags — used for parent/supersededBy pickers */
  existingTags?: WorkScopeTagListItem[];
  /** When set, the form is in edit mode and pre-populated */
  editingTag?: WorkScopeTagListItem;
}

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const STATUS_OPTIONS: { value: WorkScopeTagRecord["status"]; label: string }[] =
  [
    { value: "proposed", label: "Proposed" },
    { value: "accepted", label: "Accepted" },
    { value: "deprecated", label: "Deprecated" },
  ];

const TagFormModal: React.FC<TagFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingKeys,
  existingTags = [],
  editingTag,
}) => {
  const isEditMode = !!editingTag;

  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [kind, setKind] = useState<string>("topic");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<WorkScopeTagRecord["status"]>("proposed");
  const [parentUri, setParentUri] = useState("");
  const [supersededByUri, setSupersededByUri] = useState("");
  const [aliasesText, setAliasesText] = useState("");
  const [sameAsText, setSameAsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate key from label unless manually edited (create mode only)
  useEffect(() => {
    if (!keyManuallyEdited && !isEditMode) {
      setKey(labelToKey(label));
    }
  }, [label, keyManuallyEdited, isEditMode]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Reset / populate form when opened
  useEffect(() => {
    if (!isOpen) return;

    if (editingTag) {
      const v = editingTag.value;
      setLabel(v.label);
      setKey(v.key);
      setKeyManuallyEdited(true);
      setKind(v.kind ?? "topic");
      setDescription(v.description ?? "");
      setStatus(v.status ?? "accepted");
      setParentUri(v.parent?.uri ?? "");
      setSupersededByUri(v.supersededBy?.uri ?? "");
      setAliasesText((v.aliases ?? []).join(", "));
      setSameAsText((v.sameAs ?? []).join("\n"));
    } else {
      setLabel("");
      setKey("");
      setKeyManuallyEdited(false);
      setKind("topic");
      setDescription("");
      setStatus("proposed");
      setParentUri("");
      setSupersededByUri("");
      setAliasesText("");
      setSameAsText("");
    }
    setErrors({});
    setIsSubmitting(false);
  }, [isOpen, editingTag]);

  /** Resolve a tag URI to a StrongRef (uri + cid) from existingTags */
  const resolveRef = (uri: string): StrongRef | undefined => {
    if (!uri) return undefined;
    const tag = existingTags.find((t) => t.uri === uri);
    if (tag) return { uri: tag.uri, cid: tag.cid };
    return undefined;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!label.trim()) newErrors.label = "Label is required";
    if (!key.trim()) newErrors.key = "Key is required";
    else if (!isEditMode && existingKeys.includes(key.trim()))
      newErrors.key = "Key already exists";
    if (parentUri && !resolveRef(parentUri))
      newErrors.parent = "Selected parent tag not found";
    if (status === "deprecated" && supersededByUri && !resolveRef(supersededByUri))
      newErrors.supersededBy = "Selected replacement tag not found";
    // Validate sameAs URIs
    const sameAsLines = sameAsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const uri of sameAsLines) {
      try {
        new URL(uri);
      } catch {
        newErrors.sameAs = `Invalid URI: ${uri}`;
        break;
      }
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const aliases = aliasesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const sameAs = sameAsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const tag: Omit<WorkScopeTagRecord, "$type" | "createdAt"> = {
        key: key.trim(),
        label: label.trim(),
        kind: kind || undefined,
        description: description.trim() || undefined,
        status: status ?? "proposed",
        parent: resolveRef(parentUri),
        supersededBy:
          status === "deprecated" ? resolveRef(supersededByUri) : undefined,
        aliases: aliases.length > 0 ? aliases : undefined,
        sameAs: sameAs.length > 0 ? sameAs : undefined,
      };

      // Preserve createdAt from existing record in edit mode
      if (editingTag) {
        (tag as WorkScopeTagRecord).createdAt = editingTag.value.createdAt;
      }

      await onSubmit(tag);
      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Failed to save tag",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Tags available for parent/supersededBy (exclude self in edit mode)
  const pickableTags = existingTags.filter(
    (t) => !editingTag || t.uri !== editingTag.uri,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-navy">
            {isEditMode ? "Edit Tag" : "New Tag"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form — scrollable */}
        <form
          onSubmit={handleSubmit}
          className="px-6 py-5 space-y-4 overflow-y-auto flex-1"
        >
          {/* Label */}
          <div>
            <label className="app-card__label block mb-1.5">
              Label <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Mangrove Restoration"
              className={`h-10 w-full border ${errors.label ? "border-red-400" : "border-[rgba(15,37,68,0.15)]"} rounded bg-white px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150`}
            />
            {errors.label && (
              <p className="mt-1 text-xs text-red-500">{errors.label}</p>
            )}
          </div>

          {/* Key */}
          <div>
            <label className="app-card__label block mb-1.5">
              Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeyManuallyEdited(true);
              }}
              placeholder="e.g. mangrove_restoration"
              readOnly={isEditMode}
              className={`h-10 w-full border ${errors.key ? "border-red-400" : "border-[rgba(15,37,68,0.15)]"} rounded bg-white px-4 text-sm font-mono text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150 ${isEditMode ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
            />
            {errors.key && (
              <p className="mt-1 text-xs text-red-500">{errors.key}</p>
            )}
            {!isEditMode && (
              <p className="mt-1 text-xs text-gray-400">
                Auto-generated from label. Lowercase, underscores only.
              </p>
            )}
          </div>

          {/* Kind */}
          <div>
            <label className="app-card__label block mb-1.5">Kind</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-10 w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 text-sm text-gray-700 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150"
            >
              {WORK_SCOPE_TAG_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="app-card__label block mb-1.5">Status</label>
            <select
              value={status ?? "proposed"}
              onChange={(e) =>
                setStatus(
                  e.target.value as WorkScopeTagRecord["status"],
                )
              }
              className="h-10 w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 text-sm text-gray-700 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="app-card__label block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this tag represents..."
              rows={3}
              maxLength={10000}
              className="w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150 resize-y"
            />
          </div>

          {/* Parent */}
          <div>
            <label className="app-card__label block mb-1.5">
              Parent tag (optional)
            </label>
            <select
              value={parentUri}
              onChange={(e) => setParentUri(e.target.value)}
              className="h-10 w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 text-sm text-gray-700 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150"
            >
              <option value="">None</option>
              {pickableTags.map((t) => (
                <option key={t.uri} value={t.uri}>
                  {t.value.label} ({t.value.key})
                </option>
              ))}
            </select>
            {errors.parent && (
              <p className="mt-1 text-xs text-red-500">{errors.parent}</p>
            )}
          </div>

          {/* Superseded By — only when deprecated */}
          {status === "deprecated" && (
            <div>
              <label className="app-card__label block mb-1.5">
                Superseded by (replacement tag)
              </label>
              <select
                value={supersededByUri}
                onChange={(e) => setSupersededByUri(e.target.value)}
                className="h-10 w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 text-sm text-gray-700 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150"
              >
                <option value="">None</option>
                {pickableTags.map((t) => (
                  <option key={t.uri} value={t.uri}>
                    {t.value.label} ({t.value.key})
                  </option>
                ))}
              </select>
              {errors.supersededBy && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.supersededBy}
                </p>
              )}
            </div>
          )}

          {/* Aliases */}
          <div>
            <label className="app-card__label block mb-1.5">
              Aliases (optional)
            </label>
            <input
              type="text"
              value={aliasesText}
              onChange={(e) => setAliasesText(e.target.value)}
              placeholder="e.g. mangrove rehab, mangrove planting"
              className="h-10 w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150"
            />
            <p className="mt-1 text-xs text-gray-400">
              Comma-separated alternative names.
            </p>
          </div>

          {/* Same As */}
          <div>
            <label className="app-card__label block mb-1.5">
              Same As (optional)
            </label>
            <textarea
              value={sameAsText}
              onChange={(e) => setSameAsText(e.target.value)}
              placeholder={"https://www.wikidata.org/wiki/Q...\nhttps://..."}
              rows={2}
              className="w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 py-2.5 text-sm font-mono text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150 resize-y"
            />
            {errors.sameAs && (
              <p className="mt-1 text-xs text-red-500">{errors.sameAs}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              One URI per line. Links to equivalent concepts in external
              ontologies.
            </p>
          </div>

          {errors.submit && (
            <p className="text-xs text-red-500">{errors.submit}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-mono text-gray-600 border border-gray-200 rounded hover:border-gray-300 transition-colors duration-150 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono text-accent bg-accent/10 border border-accent/20 rounded hover:bg-accent/15 hover:border-accent/35 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {isEditMode ? "Save Changes" : "Create Tag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TagFormModal;
