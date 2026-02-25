"use client";

import React from "react";
import { Calendar, X } from "lucide-react";

export interface TimeframeFilterValue {
  /** Filter by activity start/end date overlap with this range */
  from: string; // YYYY-MM-DD or ""
  to: string;   // YYYY-MM-DD or ""
}

export interface TimeframeFilterProps {
  value: TimeframeFilterValue;
  onChange: (value: TimeframeFilterValue) => void;
  /** Total activities before filtering */
  totalCount: number;
  /** Activities after timeframe filtering */
  filteredCount: number;
}

const PRESETS: { label: string; getDates: () => { from: string; to: string } }[] = [
  {
    label: "Last 7 days",
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return { from: fmt(from), to: fmt(to) };
    },
  },
  {
    label: "Last 30 days",
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from: fmt(from), to: fmt(to) };
    },
  },
  {
    label: "Last 90 days",
    getDates: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from: fmt(from), to: fmt(to) };
    },
  },
  {
    label: "This year",
    getDates: () => {
      const now = new Date();
      return { from: `${now.getFullYear()}-01-01`, to: fmt(now) };
    },
  },
  {
    label: "Last year",
    getDates: () => {
      const now = new Date();
      const year = now.getFullYear() - 1;
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    },
  },
];

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function TimeframeFilter({
  value,
  onChange,
  totalCount,
  filteredCount,
}: TimeframeFilterProps) {
  const isActive = value.from !== "" || value.to !== "";

  const handleClear = () => {
    onChange({ from: "", to: "" });
  };

  return (
    <div
      className={`bg-white border rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 ${
        isActive
          ? "border-[var(--color-accent)]/40 bg-[rgba(96,161,226,0.03)]"
          : "border-[rgba(15,37,68,0.1)]"
      }`}
    >
      <div className="flex items-center gap-2 text-[var(--color-navy)]">
        <Calendar className="w-4 h-4 text-[var(--color-mid-gray)]" />
        <span className="text-xs font-mono font-semibold uppercase tracking-wider">
          Timeframe
        </span>
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-8 border border-[rgba(15,37,68,0.15)] rounded bg-white px-2 text-xs font-mono text-[var(--color-navy)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 focus:outline-none transition-colors"
          aria-label="From date"
        />
        <span className="text-xs text-[var(--color-mid-gray)]">&rarr;</span>
        <input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-8 border border-[rgba(15,37,68,0.15)] rounded bg-white px-2 text-xs font-mono text-[var(--color-navy)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 focus:outline-none transition-colors"
          aria-label="To date"
        />
      </div>

      {/* Presets */}
      <div className="flex items-center gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.getDates())}
            className="text-[10px] font-mono px-2 py-1 rounded border border-[rgba(15,37,68,0.1)] text-[var(--color-mid-gray)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] hover:bg-[rgba(96,161,226,0.04)] transition-colors duration-150"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Status + clear */}
      {isActive && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-mono text-[var(--color-mid-gray)]">
            <span className="font-semibold text-[var(--color-navy)]">
              {filteredCount}
            </span>{" "}
            of {totalCount} certs in range
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--color-mid-gray)] hover:text-red-500 transition-colors duration-150"
            aria-label="Clear timeframe filter"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Filter activities by timeframe.
 * An activity matches if its date range overlaps with the filter range.
 *
 * Logic:
 * - If activity has startDate/endDate, check overlap with filter range
 * - If activity only has createdAt, check if createdAt falls within filter range
 * - Empty filter dates = no constraint on that side
 */
export function filterActivitiesByTimeframe<
  T extends { value: { startDate?: string; endDate?: string; createdAt: string } },
>(
  activities: T[],
  filter: TimeframeFilterValue,
): T[] {
  if (!filter.from && !filter.to) return activities;

  const filterFrom = filter.from ? new Date(filter.from + "T00:00:00Z") : null;
  const filterTo = filter.to ? new Date(filter.to + "T23:59:59Z") : null;

  return activities.filter((activity) => {
    const v = activity.value;

    // Determine the activity's effective date range
    let actStart: Date | null = null;
    let actEnd: Date | null = null;

    if (v.startDate) {
      actStart = new Date(v.startDate);
    }
    if (v.endDate) {
      actEnd = new Date(v.endDate);
    }

    // If no start/end dates, use createdAt as a point-in-time
    if (!actStart && !actEnd) {
      const created = new Date(v.createdAt);
      actStart = created;
      actEnd = created;
    }

    // Fill in missing bounds: if only start, treat as ongoing; if only end, treat as started long ago
    if (actStart && !actEnd) {
      actEnd = new Date(); // ongoing = up to now
    }
    if (!actStart && actEnd) {
      actStart = new Date(0); // started long ago
    }

    // Now check overlap: activity range [actStart, actEnd] overlaps filter range [filterFrom, filterTo]
    // Overlap exists when: actStart <= filterTo AND actEnd >= filterFrom
    if (filterTo && actStart && actStart > filterTo) return false;
    if (filterFrom && actEnd && actEnd < filterFrom) return false;

    return true;
  });
}

export default TimeframeFilter;
