import mongoose from 'mongoose';
import { ConnectorCoercionRulesModel } from '../models/connector-coercion-rules.model';

/**
 * Universal Type Coercion Rules
 *
 * Pre-defined rules for transforming types and formats between connectors.
 * Safe to re-run anytime (upserts based on ruleId).
 */
export const UNIVERSAL_COERCION_RULES = [
  {
    ruleId: 'cents_to_dollars',
    name: 'Cents to Dollars',
    sourceRole: 'amount_money',
    sourceFormat: 'currency_cents',
    sourceType: 'number',
    targetRole: 'amount_money',
    targetFormat: 'currency_dollars',
    targetType: 'number',
    transformType: 'divide',
    parameter: 100,
    safe: true,
    lossy: false,
    description: 'Converts integer cents (e.g. 2999) to decimal dollars (29.99)',
    examples: [
      { input: 2999, output: 29.99 },
      { input: 1000, output: 10.0 }
    ],
    enabled: true
  },
  {
    ruleId: 'dollars_to_cents',
    name: 'Dollars to Cents',
    sourceRole: 'amount_money',
    sourceFormat: 'currency_dollars',
    sourceType: 'number',
    targetRole: 'amount_money',
    targetFormat: 'currency_cents',
    targetType: 'number',
    transformType: 'multiply',
    parameter: 100,
    safe: true,
    lossy: false,
    description: 'Converts decimal dollars (e.g. 29.99) to integer cents (2999)',
    examples: [
      { input: 29.99, output: 2999 },
      { input: 10.0, output: 1000 }
    ],
    enabled: true
  },
  {
    ruleId: 'unix_to_iso',
    name: 'Unix Timestamp to ISO Date String',
    sourceRole: 'timestamp',
    sourceFormat: 'unix_timestamp',
    sourceType: 'number',
    targetRole: 'timestamp',
    targetFormat: 'iso_date',
    targetType: 'string',
    transformType: 'unix_to_iso',
    safe: true,
    lossy: false,
    description: 'Converts Unix seconds or ms timestamp to ISO-8601 string',
    examples: [
      { input: 1700000000, output: '2023-11-14T22:13:20.000Z' }
    ],
    enabled: true
  },
  {
    ruleId: 'iso_to_unix',
    name: 'ISO Date String to Unix Timestamp',
    sourceRole: 'timestamp',
    sourceFormat: 'iso_date',
    sourceType: 'string',
    targetRole: 'timestamp',
    targetFormat: 'unix_timestamp',
    targetType: 'number',
    transformType: 'iso_to_unix',
    safe: true,
    lossy: false,
    description: 'Converts ISO-8601 string to Unix seconds integer',
    examples: [
      { input: '2023-11-14T22:13:20.000Z', output: 1700000000 }
    ],
    enabled: true
  },
  {
    ruleId: 'string_to_number',
    name: 'String to Number',
    sourceType: 'string',
    targetType: 'number',
    transformType: 'parse_number',
    safe: true,
    lossy: false,
    description: 'Parses numeric string to number',
    examples: [
      { input: '123.45', output: 123.45 }
    ],
    enabled: true
  },
  {
    ruleId: 'number_to_string',
    name: 'Number to String',
    sourceType: 'number',
    targetType: 'string',
    transformType: 'to_string',
    safe: true,
    lossy: false,
    description: 'Converts number to string representation',
    examples: [
      { input: 123.45, output: '123.45' }
    ],
    enabled: true
  },
  {
    ruleId: 'string_to_boolean',
    name: 'String to Boolean',
    sourceType: 'string',
    targetType: 'boolean',
    transformType: 'parse_boolean',
    safe: true,
    lossy: false,
    description: 'Parses "true", "1", "yes" to boolean true, others to false',
    examples: [
      { input: 'true', output: true },
      { input: 'false', output: false }
    ],
    enabled: true
  },
  {
    ruleId: 'boolean_to_string',
    name: 'Boolean to String',
    sourceType: 'boolean',
    targetType: 'string',
    transformType: 'to_string',
    safe: true,
    lossy: false,
    description: 'Converts boolean to "true" or "false" string',
    examples: [
      { input: true, output: 'true' }
    ],
    enabled: true
  },
  {
    ruleId: 'array_to_string',
    name: 'Array to Join String',
    sourceType: 'array',
    targetType: 'string',
    transformType: 'array_join',
    parameter: ', ',
    safe: true,
    lossy: false,
    description: 'Joins array of items into comma-separated string',
    examples: [
      { input: ['a', 'b', 'c'], output: 'a, b, c' }
    ],
    enabled: true
  },
  {
    ruleId: 'string_to_array',
    name: 'Comma String to Array',
    sourceType: 'string',
    targetType: 'array',
    transformType: 'string_split',
    parameter: ',',
    safe: true,
    lossy: false,
    description: 'Splits comma-separated string into array of strings',
    examples: [
      { input: 'a, b, c', output: ['a', 'b', 'c'] }
    ],
    enabled: true
  },
  {
    ruleId: 'json_string_to_object',
    name: 'JSON String to Object',
    sourceType: 'string',
    targetType: 'object',
    transformType: 'parse_json',
    safe: true,
    lossy: false,
    description: 'Parses JSON string into JS Object',
    examples: [
      { input: '{"foo":"bar"}', output: { foo: 'bar' } }
    ],
    enabled: true
  },
  {
    ruleId: 'object_to_json_string',
    name: 'Object to JSON String',
    sourceType: 'object',
    targetType: 'string',
    transformType: 'json_stringify',
    safe: true,
    lossy: false,
    description: 'Stringifies JS Object into JSON string',
    examples: [
      { input: { foo: 'bar' }, output: '{"foo":"bar"}' }
    ],
    enabled: true
  }
];

export async function seedCoercionRules(options: { dryRun?: boolean } = {}) {
  if (options.dryRun) {
    console.log('DRY RUN: Would seed the following coercion rules:');
    console.table(UNIVERSAL_COERCION_RULES.map(r => ({ ruleId: r.ruleId, name: r.name, from: `${r.sourceType}(${r.sourceFormat || '*'})`, to: `${r.targetType}(${r.targetFormat || '*'})` })));
    return;
  }

  let count = 0;
  for (const rule of UNIVERSAL_COERCION_RULES) {
    await ConnectorCoercionRulesModel.findOneAndUpdate(
      { ruleId: rule.ruleId },
      { $set: { ...rule, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
    count++;
  }
  console.log(`✅ Seeded ${count} coercion rules to connector_coercion_rules`);
}

// Run directly if called as a script
if (require.main === module) {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/automation_platform';
  mongoose.connect(MONGO_URI).then(async () => {
    await seedCoercionRules({ dryRun: process.argv.includes('--dry-run') });
    await mongoose.disconnect();
  }).catch(err => {
    console.error('Failed to seed coercion rules:', err);
    process.exit(1);
  });
}
