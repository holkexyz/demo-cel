export const ACTIVITY_COLLECTION = "org.hypercerts.claim.activity";

/**
 * Matches lexicon: org.hypercerts.helper.celExpression (embedded as workScope)
 * @see https://github.com/hypercerts-org/hypercerts-lexicon/blob/feat/cel-work-scope-expressions/lexicons/org/hypercerts/helper/celExpression.json
 */
export interface CelExpression {
  $type?: string;
  /** CEL expression encoding work scope conditions. maxLength: 10000 */
  expression: string;
  /** Flat list of workScopeTag keys referenced in the expression. maxLength: 100 */
  labels: string[];
  /** CEL context schema version. Currently 'v1'. maxLength: 16 */
  version: string;
  /** Client-declared timestamp. format: datetime */
  createdAt: string;
}

/**
 * Matches lexicon: org.hypercerts.claim.activity
 * required: title, shortDescription, createdAt
 * @see https://github.com/hypercerts-org/hypercerts-lexicon/blob/feat/cel-work-scope-expressions/lexicons/org/hypercerts/claim/activity.json
 */
export interface ActivityRecord {
  $type?: string;
  /** Title of the hypercert. maxLength: 256 */
  title: string;
  /** Short summary, suitable for previews and list views. maxLength: 3000, maxGraphemes: 300 */
  shortDescription: string;
  /** Optional longer description. maxLength: 30000, maxGraphemes: 3000 */
  description?: string;
  /** Work scope as a CEL expression (primary union variant we use) */
  workScope: CelExpression;
  /** When the work began. format: datetime */
  startDate?: string;
  /** When the work ended. format: datetime */
  endDate?: string;
  /** Client-declared timestamp. format: datetime */
  createdAt: string;
}

export interface ActivityListItem {
  uri: string;
  cid: string;
  rkey: string;
  value: ActivityRecord;
}
