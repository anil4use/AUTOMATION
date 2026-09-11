import mongoose, { Schema, model, Document } from 'mongoose';

/**
 * connector_field_catalog
 *
 * Stores the semantic meaning of every input/output field for every
 * operation across every connector. The AI Data Bridge and TypeCoercer
 * query this collection at runtime — NOT hardcoded TypeScript.
 *
 * Seeded by: packages/database/src/seeds/seed-field-catalog.ts
 * Admin API: PATCH /api/v1/admin/field-catalog/:id
 */
export interface IConnectorFieldCatalog extends Document {
  // ── Identity ──────────────────────────────────────────────
  connectorId: string;    // "gmail", "stripe", "hubspot"
  operationId: string;    // "new_email", "new_charge", "create_deal"
  operationType: string;  // "trigger" | "action"
  direction: string;      // "input" | "output"
  fieldKey: string;       // "from", "amount", "customerEmail"

  // ── Schema (mirrored from manifest) ────────────────────────
  fieldLabel: string;     // "Sender Email (From)"
  fieldType: string;      // "string" | "number" | "boolean" | "json" | "array" | "object"
  required: boolean;

  // ── AI Bridge Intelligence ─────────────────────────────────
  semanticRole: string | null;  // "email_address" | "amount_money" | "timestamp" | ...
  format: string | null;        // "email" | "currency_cents" | "unix_timestamp" | ...

  // ── Transform Hints ────────────────────────────────────────
  synonyms: string[];       // ["email", "sender", "from_email"]
  transformHints: string[]; // ["extract_email_from_name_format", "cents_to_dollars_required"]
  notes: string;            // "Stripe outputs amounts as INTEGER CENTS. 4999 = $49.99"

  // ── Metadata ───────────────────────────────────────────────
  autoDetected: boolean;  // true = seeded by script, false = manually set
  confidence: number;     // 0–1 — auto-detection confidence
  version: string;        // connector version this applies to
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorFieldCatalogSchema = new Schema<IConnectorFieldCatalog>(
  {
    connectorId:   { type: String, required: true, index: true },
    operationId:   { type: String, required: true },
    operationType: { type: String, enum: ['trigger', 'action'], required: true },
    direction:     { type: String, enum: ['input', 'output'], required: true },
    fieldKey:      { type: String, required: true },

    fieldLabel: { type: String, required: true },
    fieldType:  { type: String, enum: ['string', 'number', 'boolean', 'select', 'json', 'array', 'object'], default: 'string' },
    required:   { type: Boolean, default: false },

    semanticRole: { type: String, default: null },
    format:       { type: String, default: null },

    synonyms:      { type: [String], default: [] },
    transformHints:{ type: [String], default: [] },
    notes:         { type: String, default: '' },

    autoDetected: { type: Boolean, default: true },
    confidence:   { type: Number, default: 0, min: 0, max: 1 },
    version:      { type: String, default: '2.0.0' },
    enabled:      { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Compound unique index — one entry per (connector, operation, direction, field)
ConnectorFieldCatalogSchema.index(
  { connectorId: 1, operationId: 1, direction: 1, fieldKey: 1 },
  { unique: true }
);
ConnectorFieldCatalogSchema.index({ semanticRole: 1 });
ConnectorFieldCatalogSchema.index({ connectorId: 1, direction: 1 });
ConnectorFieldCatalogSchema.index({ enabled: 1 });

export const ConnectorFieldCatalogModel =
  mongoose.models.ConnectorFieldCatalog ||
  model<IConnectorFieldCatalog>(
    'ConnectorFieldCatalog',
    ConnectorFieldCatalogSchema,
    'connector_field_catalog'
  );
