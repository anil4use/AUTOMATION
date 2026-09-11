/**
 * Seed: connector_field_catalog
 *
 * Reads ALL connector manifests from manifestRegistry and populates the
 * connector_field_catalog MongoDB collection.
 *
 * Safe to re-run at any time — uses upsert (no duplicates, no data loss).
 *
 * Usage:
 *   npm run seed:field-catalog                         → all connectors
 *   npm run seed:field-catalog -- --connector=gmail    → single connector
 *   npm run seed:field-catalog -- --dry-run            → preview without writing
 *   npm run seed:field-catalog -- --force              → overwrite manually reviewed entries too
 *
 * See docs: docs/features/12_seed_strategy.md
 */

import mongoose from 'mongoose';
import { PATTERN_RULES } from './pattern-rules';

// Lazy-require to avoid circular dependency issues at module load
async function getModels() {
  const { ConnectorFieldCatalogModel } = await import('../index.js');
  return { ConnectorFieldCatalogModel };
}

async function getManifestRegistry() {
  const { manifestRegistry } = await import('@automation/connector-sdk');
  return manifestRegistry;
}

interface SeedOptions {
  connector?: string;   // seed only this connectorId
  dryRun?:   boolean;   // print what would be seeded, don't write
  force?:    boolean;   // overwrite entries with autoDetected: false (manually reviewed)
  verbose?:  boolean;
}

interface CatalogEntry {
  connectorId:   string;
  operationId:   string;
  operationType: string;
  direction:     string;
  fieldKey:      string;
  fieldLabel:    string;
  fieldType:     string;
  required:      boolean;
  semanticRole:  string | null;
  format:        string | null;
  synonyms:      string[];
  transformHints:string[];
  notes:         string;
  autoDetected:  boolean;
  confidence:    number;
  version:       string;
  enabled:       boolean;
}

function buildEntry(
  connectorId: string,
  operationId: string,
  operationType: string,
  direction: string,
  field: any
): CatalogEntry {
  // If manifest explicitly sets semanticRole/format → use those (confidence 1.0, not autoDetected)
  const hasExplicitRole   = Boolean(field.semanticRole);
  const hasExplicitFormat = Boolean(field.format);

  const detected = PATTERN_RULES.detect(connectorId, field.key, field.label || field.key, field.type || 'string');

  return {
    connectorId,
    operationId,
    operationType,
    direction,
    fieldKey:      field.key,
    fieldLabel:    field.label || field.key,
    fieldType:     field.type  || 'string',
    required:      Boolean(field.required),
    semanticRole:  field.semanticRole  || detected.role,
    format:        field.format        || detected.format,
    synonyms:      detected.synonyms,
    transformHints:detected.transformHints,
    notes:         field.description   || detected.notes,
    autoDetected:  !hasExplicitRole,
    confidence:    hasExplicitRole ? 1.0 : detected.confidence,
    version:       '2.0.0',
    enabled:       true,
  };
}

export async function seedFieldCatalog(options: SeedOptions = {}) {
  const { ConnectorFieldCatalogModel } = await getModels();
  const registry = await getManifestRegistry();

  const manifests = registry.getAllManifests
    ? registry.getAllManifests()
    : Object.values((registry as any).manifests || {});

  const filtered = options.connector
    ? manifests.filter((m: any) => m.id === options.connector)
    : manifests;

  if (filtered.length === 0) {
    console.warn(`⚠️  No manifests found${options.connector ? ` for connector: ${options.connector}` : ''}`);
    return;
  }

  const entries: CatalogEntry[] = [];

  for (const manifest of filtered as any[]) {
    // Process triggers
    for (const trigger of (manifest.triggers || [])) {
      for (const field of (trigger.outputs || [])) {
        entries.push(buildEntry(manifest.id, trigger.id, 'trigger', 'output', field));
      }
      for (const field of (trigger.inputs || [])) {
        entries.push(buildEntry(manifest.id, trigger.id, 'trigger', 'input', field));
      }
    }

    // Process actions
    for (const action of (manifest.actions || [])) {
      for (const field of (action.inputs || [])) {
        entries.push(buildEntry(manifest.id, action.id, 'action', 'input', field));
      }
      for (const field of (action.outputs || [])) {
        entries.push(buildEntry(manifest.id, action.id, 'action', 'output', field));
      }
    }
  }

  if (options.dryRun) {
    console.log(`\n🔍 DRY RUN — would seed ${entries.length} entries:\n`);
    entries.slice(0, 20).forEach(e => {
      console.log(`  [${e.connectorId}] ${e.operationId}.${e.direction}.${e.fieldKey}`
        + ` → role: ${e.semanticRole || 'UNKNOWN'}`
        + ` | format: ${e.format || 'none'}`
        + ` | confidence: ${(e.confidence * 100).toFixed(0)}%`
        + (e.autoDetected ? '' : ' ⭐ explicit'));
    });
    if (entries.length > 20) console.log(`  ... and ${entries.length - 20} more`);
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of entries) {
    const filter = {
      connectorId: entry.connectorId,
      operationId: entry.operationId,
      direction:   entry.direction,
      fieldKey:    entry.fieldKey,
    };

    const existing = await ConnectorFieldCatalogModel.findOne(filter).lean() as any;

    // Skip if manually reviewed (autoDetected: false) and --force not passed
    if (existing && !existing.autoDetected && !options.force) {
      skipped++;
      continue;
    }

    await ConnectorFieldCatalogModel.findOneAndUpdate(
      filter,
      { $set: { ...entry, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    existing ? updated++ : created++;

    if (options.verbose) {
      console.log(`  ✅ [${entry.connectorId}] ${entry.operationId}.${entry.direction}.${entry.fieldKey}`
        + ` → ${entry.semanticRole || 'no-role'}`);
    }
  }

  console.log(`\n✅ Seed complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (manually reviewed, use --force to overwrite): ${skipped}`);
  console.log(`   Total processed: ${entries.length}\n`);
}

// ─── CLI entry point ────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (prefix: string) => {
    const a = args.find(a => a.startsWith(prefix));
    return a ? a.replace(prefix, '') : undefined;
  };

  const options: SeedOptions = {
    connector: getArg('--connector='),
    dryRun:    args.includes('--dry-run'),
    force:     args.includes('--force'),
    verbose:   args.includes('--verbose'),
  };

  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/automation_platform';

  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log(`\n🌱 Seeding connector field catalog...`);
      if (options.connector) console.log(`   Connector filter: ${options.connector}`);
      return seedFieldCatalog(options);
    })
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
