import mongoose, { Schema, model, Document } from 'mongoose';

/**
 * connector_synonym_groups
 *
 * Groups of field key names that mean the SAME THING across connectors.
 * The SemanticFieldMatcher uses these to find matching fields when exact
 * key names differ.
 *
 * Example: "text", "body", "content", "message_text", "bodyPlain" all mean
 * the same thing — the main text/content field.
 *
 * These are UNIVERSAL — apply across all connectors.
 * Seeded by: packages/database/src/seeds/seed-synonym-groups.ts
 * Adding new synonyms = update a document. Zero code change.
 */
export interface IConnectorSynonymGroup extends Document {
  groupName?:   string;
  canonicalRole?: string;
  semanticRole?: string;
  name?:         string;
  synonyms:     string[];
  description:  string;
  enabled:      boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

const ConnectorSynonymGroupSchema = new Schema<IConnectorSynonymGroup>(
  {
    groupName:    { type: String },
    canonicalRole: { type: String, index: true },
    semanticRole: { type: String, index: true },
    name:         { type: String },
    synonyms:     { type: [String], default: [] },
    description:  { type: String, default: '' },
    enabled:      { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const ConnectorSynonymGroupModel =
  mongoose.models.ConnectorSynonymGroup ||
  model<IConnectorSynonymGroup>(
    'ConnectorSynonymGroup',
    ConnectorSynonymGroupSchema,
    'connector_synonym_groups'
  );

export const ConnectorSynonymGroupsModel = ConnectorSynonymGroupModel;
