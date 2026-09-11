import mongoose, { Schema, model, Document } from 'mongoose';

/**
 * connector_coercion_rules
 *
 * Stores type conversion rules as data, not code.
 * When source field has sourceRole+sourceFormat and target has targetRole+targetFormat,
 * the TypeCoercer applies the named coercionMethod automatically.
 *
 * These rules are UNIVERSAL — they apply across all connectors.
 * Seeded by: packages/database/src/seeds/seed-coercion-rules.ts
 * Adding a new coercion rule = insert a document. Zero code change.
 */
export interface IConnectorCoercionRule extends Document {
  ruleId: string;
  // ── Matching Criteria ─────────────────────────────────────
  // A rule fires when source field has sourceRole+sourceFormat
  // AND target field has targetRole+targetFormat.
  // Use "*" or null as wildcard (any role/format matches).
  sourceRole:   string | null;  // "amount_money" — or null for wildcard
  sourceFormat: string | null;  // "currency_cents" — or null for any format
  targetRole:   string | null;  // "amount_money"
  targetFormat: string | null;  // "currency_dollars"

  // ── The Conversion ─────────────────────────────────────────
  coercionMethod: string;  // Named method executed by TypeCoercer
  // Supported methods:
  // "divide_by_100"       — cents → dollars (4999 → 49.99)
  // "multiply_by_100"     — dollars → cents (49.99 → 4999)
  // "unix_seconds_to_iso" — 1699900000 → "2023-11-13T12:26:40.000Z"
  // "iso_to_unix_seconds" — ISO date → unix seconds
  // "unix_ms_to_iso"      — unix milliseconds → ISO date
  // "extract_email"       — "John <j@ex.com>" → "j@ex.com"
  // "normalize_e164"      — "(555) 123-4567" → "+15551234567"
  // "join_array_csv"      — ["a","b"] → "a,b"
  // "split_csv_array"     — "a,b" → ["a","b"]
  // "json_stringify"      — {a:1} → '{"a":1}'
  // "json_parse"          — '{"a":1}' → {a:1}
  // "to_string"           — any → String(value)
  // "to_number"           — any → parseFloat(value)
  // "to_boolean"          — "true"/"false"/1/0 → boolean
  // "split_fullname"      — "John Doe" → {firstName:"John",lastName:"Doe"}
  // "join_fullname"       — {firstName,lastName} → "John Doe"
  // "strip_html"          — "<p>Hello</p>" → "Hello"
  // "format_currency_str" — 49.99 → "49.99" (ensure string with 2 decimal places)

  // ── Metadata ───────────────────────────────────────────────
  name:        string;
  description: string;
  example: {
    input:  any;
    output: any;
  };
  priority: number;  // higher = checked first (default 0)
  enabled:  boolean;
}

const CoercionExampleSchema = new Schema({ input: Schema.Types.Mixed, output: Schema.Types.Mixed }, { _id: false });

const ConnectorCoercionRuleSchema = new Schema<IConnectorCoercionRule>(
  {
    ruleId:       { type: String, required: true, unique: true },
    sourceRole:   { type: String, default: null },
    sourceFormat: { type: String, default: null },
    targetRole:   { type: String, default: null },
    targetFormat: { type: String, default: null },

    coercionMethod: { type: String, required: true },

    name:        { type: String, required: true },
    description: { type: String, default: '' },
    example:     { type: CoercionExampleSchema, default: {} },
    priority:    { type: Number, default: 0, index: true },
    enabled:     { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ConnectorCoercionRuleSchema.index({ sourceRole: 1, sourceFormat: 1, targetRole: 1, targetFormat: 1 });
ConnectorCoercionRuleSchema.index({ priority: -1, enabled: 1 });

export const ConnectorCoercionRuleModel =
  mongoose.models.ConnectorCoercionRule ||
  model<IConnectorCoercionRule>(
    'ConnectorCoercionRule',
    ConnectorCoercionRuleSchema,
    'connector_coercion_rules'
  );

export const ConnectorCoercionRulesModel = ConnectorCoercionRuleModel;
