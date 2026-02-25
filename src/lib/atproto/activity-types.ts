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

export interface ActivityRecord {
  $type?: string;
  title: string;
  description: string;
  workScope: CelExpression;
  createdAt: string;
}

export interface ActivityListItem {
  uri: string;
  cid: string;
  rkey: string;
  value: ActivityRecord;
}
