export const WORK_SCOPE_TAG_COLLECTION = "org.hypercerts.helper.workScopeTag";

/**
 * ATProto strong reference to another record.
 * See: com.atproto.repo.strongRef
 */
export interface StrongRef {
  uri: string;
  cid: string;
}

/**
 * Matches lexicon: org.hypercerts.helper.workScopeTag
 * @see https://github.com/hypercerts-org/hypercerts-lexicon/blob/feat/cel-work-scope-expressions/lexicons/org/hypercerts/helper/workScopeTag.json
 */
export interface WorkScopeTagRecord {
  $type?: string;
  /** Lowercase, underscore-separated machine-readable key. maxLength: 120 */
  key: string;
  /** Human-readable label. maxLength: 200 */
  label: string;
  /** Category type. knownValues: topic, language, domain, method, tag */
  kind?: string;
  /** Optional longer description. maxLength: 10000, maxGraphemes: 1000 */
  description?: string;
  /** Strong reference to a parent workScopeTag record for taxonomy/hierarchy */
  parent?: StrongRef;
  /** Lifecycle status. knownValues: proposed, accepted, deprecated */
  status?: "proposed" | "accepted" | "deprecated";
  /** When status is 'deprecated', strong reference to the replacement tag */
  supersededBy?: StrongRef;
  /** Alternative names or identifiers. maxLength: 50 items */
  aliases?: string[];
  /** Links to equivalent concepts in external ontologies (URIs). maxLength: 20 items */
  sameAs?: string[];
  /** Optional external reference (URI or blob) */
  externalReference?: { $type: string; [key: string]: unknown };
  /** Client-declared timestamp. format: datetime */
  createdAt: string;
}

export interface WorkScopeTagListItem {
  uri: string;
  cid: string;
  rkey: string;
  value: WorkScopeTagRecord;
}

/** Known kind values from the lexicon */
export const WORK_SCOPE_TAG_KINDS = [
  "topic",
  "language",
  "domain",
  "method",
  "tag",
] as const;

export type WorkScopeTagKind = (typeof WORK_SCOPE_TAG_KINDS)[number];
