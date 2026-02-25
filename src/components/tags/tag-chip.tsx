"use client";

import React from "react";
import { X } from "lucide-react";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";

export interface TagChipProps {
  tag: WorkScopeTagListItem;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  showKind?: boolean;
  size?: "sm" | "md";
}

const KIND_COLORS: Record<
  string,
  { base: string; selected: string; border: string }
> = {
  topic: {
    base: "bg-emerald-100 text-emerald-800",
    selected: "bg-emerald-200 text-emerald-800",
    border: "border-emerald-300",
  },
  language: {
    base: "bg-cyan-100 text-cyan-800",
    selected: "bg-cyan-200 text-cyan-800",
    border: "border-cyan-300",
  },
  domain: {
    base: "bg-purple-100 text-purple-800",
    selected: "bg-purple-200 text-purple-800",
    border: "border-purple-300",
  },
  method: {
    base: "bg-blue-100 text-blue-800",
    selected: "bg-blue-200 text-blue-800",
    border: "border-blue-300",
  },
  tag: {
    base: "bg-amber-100 text-amber-800",
    selected: "bg-amber-200 text-amber-800",
    border: "border-amber-300",
  },
};

export const TagChip: React.FC<TagChipProps> = ({
  tag,
  selected = false,
  onClick,
  onRemove,
  showKind = false,
  size = "md",
}) => {
  const colors = KIND_COLORS[tag.value.kind ?? "topic"] ?? KIND_COLORS.topic;
  const bgClass = selected ? colors.selected : colors.base;
  const sizeClass =
    size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex flex-col items-start border rounded-full ${bgClass} ${colors.border} ${sizeClass} ${onClick ? "cursor-pointer" : ""} transition-colors duration-150`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      {showKind && (
        <span className="text-[10px] uppercase tracking-wider opacity-60 leading-none mb-0.5">
          {tag.value.kind}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        {tag.value.label}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="ml-1 rounded-full hover:opacity-70 transition-opacity"
            aria-label={`Remove ${tag.value.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </span>
    </span>
  );
};

export default TagChip;
