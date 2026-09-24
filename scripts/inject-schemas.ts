/**
 * inject-schemas.ts
 * Auto-injects inputSchema + outputSchema into every connector action
 * that is missing them. Derived from the existing inputs[] / outputs[] arrays.
 * Run: npx tsx scripts/inject-schemas.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const INTEGRATIONS_DIR = path.join(__dirname, '../packages/connector-sdk/src/integrations');

interface FieldEntry {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  enum?: string[];
  dynamicChoice?: { endpoint: string };
}

function mapType(t: string): string {
  if (t === 'json' || t === 'object') return 'object';
  if (t === 'number' || t === 'integer') return 'number';
  if (t === 'boolean') return 'boolean';
  if (t === 'array') return 'array';
  return 'string';
}

function buildInputSchema(fields: FieldEntry[], indent: string): string {
  const required = fields.filter(f => f.required).map(f => `'${f.key}'`);
  const props = fields.map(f => {
    const type = mapType(f.type);
    const dynOpt = f.dynamicChoice?.endpoint
      ? `, dynamicOptions: { endpoint: '${f.dynamicChoice.endpoint}' }`
      : '';
    const enumStr = (f.enum && f.enum.length)
      ? `, enum: [${f.enum.map(e => `'${e}'`).join(', ')}]`
      : '';
    const label = f.label.replace(/'/g, "\\'");
    return `${indent}    ${f.key.padEnd(22)}: { type: '${type}', title: '${label}'${dynOpt}${enumStr} },`;
  }).join('\n');

  const reqStr = required.length ? `\n${indent}  required: [${required.join(', ')}],` : '';
  return `${indent}inputSchema: {\n${indent}  type: 'object',${reqStr}\n${indent}  properties: {\n${props}\n${indent}  },\n${indent}},`;
}

function buildOutputSchema(fields: FieldEntry[], indent: string): string {
  const props = fields.map(f => {
    const type = mapType(f.type);
    const label = f.label.replace(/'/g, "\\'");
    return `${indent}    ${f.key.padEnd(22)}: { type: '${type}', title: '${label}' },`;
  }).join('\n');

  return `${indent}outputSchema: {\n${indent}  type: 'object',\n${indent}  properties: {\n${props}\n${indent}  },\n${indent}},`;
}

function parseFieldList(content: string): FieldEntry[] {
  const fields: FieldEntry[] = [];
  const fieldRegex = /\{[^{}]+\}/g;
  let fm: RegExpExecArray | null;
  while ((fm = fieldRegex.exec(content)) !== null) {
    const fStr = fm[0];
    const keyM   = fStr.match(/key:\s*['"]([^'"]+)['"]/);
    const labelM = fStr.match(/label:\s*['"]([^'"]+)['"]/);
    const typeM  = fStr.match(/type:\s*['"]([^'"]+)['"]/);
    const reqM   = fStr.match(/required:\s*(true|false)/);
    const dynM   = fStr.match(/endpoint:\s*['"]([^'"]+)['"]/);
    const enumM  = fStr.match(/enum:\s*\[([^\]]+)\]/);
    if (keyM && labelM && typeM) {
      const field: FieldEntry = {
        key: keyM[1],
        label: labelM[1],
        type: typeM[1],
        required: reqM ? reqM[1] === 'true' : false,
      };
      if (dynM) field.dynamicChoice = { endpoint: dynM[1] };
      if (enumM) field.enum = enumM[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
      fields.push(field);
    }
  }
  return fields;
}

function processFile(filePath: string): { changed: boolean; actionsPatched: number; reason?: string } {
  const source = fs.readFileSync(filePath, 'utf8');

  if (!source.includes("type: 'action'")) {
    return { changed: false, actionsPatched: 0, reason: 'No actions found' };
  }

  // Find action blocks between 'type: action' markers and patch missing schemas
  // Strategy: find each action block that has inputs/outputs but NO inputSchema/outputSchema
  // Use a lookahead-safe approach: split at action boundaries

  // Step 1: collect action block text spans that need patching
  // An action block looks like: { id: '...', ..., type: 'action', ..., inputs: [...], outputs: [...] }
  // We match from 'id:' to the closing '},' of the action

  let newSource = source;
  let patchedCount = 0;

  // Match action objects within the actions: [] array
  // We look for blocks that contain type: 'action' but not inputSchema
  const actionPattern = /(\n\s+)\{(\s*\n\s+id:\s*['"][^'"]+['"],[\s\S]*?type:\s*'action',[\s\S]*?)(inputs:\s*\[[\s\S]*?\]\s*,)([\s\S]*?)(outputs:\s*\[[\s\S]*?\]\s*,)([\s\S]*?\n\s+\})/g;

  let match: RegExpExecArray | null;
  const patches: Array<{ original: string; replacement: string }> = [];

  // Reset regex
  actionPattern.lastIndex = 0;

  while ((match = actionPattern.exec(newSource)) !== null) {
    const fullMatch = match[0];
    const linePrefix = match[1];   // newline + indent before {
    const beforeInputs = match[2]; // content between id: and inputs:
    const inputsBlock = match[3];  // 'inputs: [...], '
    const between = match[4];      // content between inputs and outputs
    const outputsBlock = match[5]; // 'outputs: [...], '
    const afterOutputs = match[6]; // closing }

    // Skip already patched
    if (fullMatch.includes('inputSchema:') || fullMatch.includes('outputSchema:')) continue;

    // Get indent for schema generation (2 extra spaces from the indent before {)
    const indent = linePrefix.replace('\n', '') + '  ';

    // Parse inputs
    const inputsContent = inputsBlock.match(/\[([\s\S]*?)\]/)?.[1] || '';
    const inputFields = parseFieldList(inputsContent);

    // Parse outputs
    const outputsContent = outputsBlock.match(/\[([\s\S]*?)\]/)?.[1] || '';
    const outputFields = parseFieldList(outputsContent);

    if (inputFields.length === 0 && outputFields.length === 0) continue;

    const inSchema = inputFields.length > 0 ? buildInputSchema(inputFields, indent) + '\n' : '';
    const outSchema = outputFields.length > 0 ? buildOutputSchema(outputFields, indent) + '\n' : '';

    const replacement = `${linePrefix}{${beforeInputs}${inSchema}${indent}${inputsBlock}${between}${outSchema}${indent}${outputsBlock}${afterOutputs}`;

    patches.push({ original: fullMatch, replacement });
    patchedCount++;
  }

  if (patches.length === 0) {
    return { changed: false, actionsPatched: 0, reason: 'Already patched or no matching pattern' };
  }

  for (const p of patches) {
    newSource = newSource.replace(p.original, p.replacement);
  }

  fs.writeFileSync(filePath, newSource, 'utf8');
  return { changed: true, actionsPatched: patchedCount };
}

function main() {
  const connectors = fs.readdirSync(INTEGRATIONS_DIR).filter(d =>
    fs.statSync(path.join(INTEGRATIONS_DIR, d)).isDirectory()
  ).sort();

  console.log(`\n🚀 AutoFlow Schema Injector — Processing ${connectors.length} connectors\n`);
  console.log('='.repeat(72));

  let totalPatched = 0;
  let totalChanged = 0;
  const results: Array<{ name: string; status: string; actions: number }> = [];

  for (const connector of connectors) {
    const connDir = path.join(INTEGRATIONS_DIR, connector);
    const filesToTry = ['manifest.ts', 'index.ts', 'actions.ts'];
    let connectorPatched = 0;
    let connectorChanged = false;

    for (const file of filesToTry) {
      const filePath = path.join(connDir, file);
      if (fs.existsSync(filePath)) {
        try {
          const result = processFile(filePath);
          if (result.changed) {
            connectorChanged = true;
            connectorPatched += result.actionsPatched;
          }
        } catch (err: any) {
          console.error(`Error processing ${filePath}: ${err.message}`);
        }
      }
    }

    if (connectorChanged) {
      totalChanged++;
      totalPatched += connectorPatched;
      results.push({ name: connector, status: '✅ PATCHED', actions: connectorPatched });
    } else {
      results.push({ name: connector, status: '⬜ Already up to date or no actions match', actions: 0 });
    }
  }

  console.log('\nConnector                    Status                              Actions');
  console.log('-'.repeat(72));
  for (const r of results) {
    const actions = r.actions > 0 ? String(r.actions) : '-';
    console.log(`${r.name.padEnd(28)} ${r.status.padEnd(38)} ${actions}`);
  }

  console.log('\n' + '='.repeat(72));
  console.log(`✅ Complete: ${totalChanged} connectors patched, ${totalPatched} action schemas injected`);
  console.log('\nNext Steps:');
  console.log('  1. npm run build -w @automation/connector-sdk');
  console.log('  2. npm run connectors:seed');
}

main();
