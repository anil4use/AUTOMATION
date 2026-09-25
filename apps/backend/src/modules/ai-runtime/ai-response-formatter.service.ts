import { AIRuntimeService } from './ai-runtime.service';
import { logger } from '../../config/logger';

export interface FormatResponseOptions {
  rawResponse: any;
  userInstruction?: string;
  requestedFormat?: 'auto' | 'summary' | 'pdf' | 'table' | 'csv' | 'json' | 'text';
  providerId?: string;
  modelId?: string;
}

export interface FormattedResponseResult {
  formattedContent: string;
  formatType: 'summary' | 'pdf' | 'table' | 'csv' | 'json' | 'text';
  summaryTitle: string;
  isNormalized: boolean;
  rawOriginal: any;
}

export class AIResponseFormatterService {
  /**
   * Main entry point: sanitize, normalize, and format AI/API outputs into human-readable results.
   * Priority: LLM-powered formatting → deterministic rule-based fallback.
   */
  static async format(options: FormatResponseOptions): Promise<FormattedResponseResult> {
    const { rawResponse, userInstruction = '', requestedFormat = 'auto', providerId, modelId } = options;

    const detectedFormat = this.detectTargetFormat(userInstruction, requestedFormat);
    const summaryTitle = this.generateTitleFromInstruction(userInstruction, rawResponse);

    // 1. LLM-powered intelligent formatter (primary path)
    try {
      const aiResult = await this.formatWithAI(rawResponse, userInstruction, detectedFormat, providerId, modelId);
      if (aiResult && aiResult.trim().length > 10) {
        return {
          formattedContent: aiResult,
          formatType: detectedFormat,
          summaryTitle,
          isNormalized: true,
          rawOriginal: rawResponse,
        };
      }
    } catch (err: any) {
      logger.warn(`[AIResponseFormatter] AI formatting fell back to deterministic: ${err.message}`);
    }

    // 2. Deterministic rule-based fallback
    const fallback = this.formatDeterministic(rawResponse, userInstruction, detectedFormat);
    return {
      formattedContent: fallback,
      formatType: detectedFormat,
      summaryTitle,
      isNormalized: true,
      rawOriginal: rawResponse,
    };
  }

  /**
   * Detect requested output format from user query keywords or explicit option.
   */
  private static detectTargetFormat(
    instruction: string,
    requested: string
  ): 'summary' | 'pdf' | 'table' | 'csv' | 'json' | 'text' {
    if (requested && requested !== 'auto') {
      return requested as any;
    }
    const lower = instruction.toLowerCase();
    if (lower.includes('pdf') || lower.includes('document export')) return 'pdf';
    if (lower.includes('csv') || lower.includes('excel') || lower.includes('comma separated')) return 'csv';
    if (lower.includes('table') || lower.includes('grid') || lower.includes('rows')) return 'table';
    if (lower.includes('json') || lower.includes('raw json schema')) return 'json';
    if (lower.includes('summary') || lower.includes('summarize') || lower.includes('bullet')) return 'summary';
    return 'text';
  }

  /**
   * Derive a clean, human-readable title from user instruction or raw response context.
   */
  private static generateTitleFromInstruction(instruction: string, raw: any): string {
    if (instruction && instruction.trim()) {
      const clean = instruction.trim().replace(/^(give me|show me|get|generate|fetch|format|please|the)\s+/i, '');
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    if (typeof raw === 'object' && raw !== null) {
      if (raw.title) return String(raw.title);
      if (raw.promptKey) return `Output: ${raw.promptKey}`;
    }
    return 'Analysis & Summary Report';
  }

  /**
   * LLM-powered response formatter.
   *
   * The prompt is carefully structured to:
   * 1. Understand the user's ORIGINAL intent (what they asked for)
   * 2. Look at the RAW data returned by connectors/APIs
   * 3. Produce output that directly answers the user's request — not just a dump of keys
   *
   * If data is emails → show email list in natural language
   * If data is a plan → explain what the system will do
   * If data is saved files → confirm what was saved and where
   * If data is search results → show readable search results
   */
  private static async formatWithAI(
    raw: any,
    instruction: string,
    formatType: string,
    providerId?: string,
    modelId?: string
  ): Promise<string> {
    const rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);

    // Classify the data type so we give LLM proper context
    const dataType = this.classifyDataType(raw);
    const outputFormatInstruction = this.getFormatInstruction(formatType);

    //     const systemPrompt = `You are AutoFlow's intelligent output formatter. Your only job is to convert raw connector/API data into a clean, human-readable response that directly answers what the user asked for.

    // USER'S ORIGINAL REQUEST:
    // "${instruction || 'Format this data in a helpful way'}"

    // DATA TYPE DETECTED: ${dataType}
    // OUTPUT FORMAT REQUESTED: ${formatType.toUpperCase()}

    // STRICT RULES — NEVER BREAK THESE:
    // 1. ONLY use real data from the payload — NEVER invent, guess, or hallucinate values
    // 2. Present the data in the exact format requested (${outputFormatInstruction})
    // 3. If the data is an EXECUTION PLAN (has connectorId, actionId, stepId fields):
    //    - Explain what actions will be taken in simple human language
    //    - Do NOT just copy the JSON — translate it to natural English
    //    - Example: "Step 1: Read your 5 latest Gmail emails → Step 2: Save them as a CSV to Data Vault"
    // 4. If the data is EMAIL data (has from, subject, date, snippet fields):
    //    - Show a clean readable list of emails with sender, subject, date
    //    - If CSV is requested, produce valid CSV with headers: Sender Name, Sender Email, Date, Subject
    // 5. If the data contains SAVED FILE info (has path, saved, filename):
    //    - Confirm what was saved, where, and when in friendly language
    // 6. If the data is API/connector output of any other type:
    //    - Present it in the most useful format for the user's intent
    // 7. Strip all internal technical fields: stepId, connectionId, connectorId, _id, __v, organizationId, encryptedCredentials
    // 8. For CSV output: start directly with the CSV headers — no markdown, no code blocks, no backticks
    // 9. For table output: use proper markdown table syntax with | separator
    // 10. Be concise — no padding, no repetition, no generic filler text

    // ${outputFormatInstruction}`;

    const systemPrompt = `You are AutoFlow's intelligent response normalization and formatting engine.

Your job is to transform RAW connector/API/tool output into the exact result requested by the user's original instruction.

USER'S ORIGINAL REQUEST:
"${instruction || 'Format this data in the most useful representation'}"

DETECTED DATA TYPE:
${dataType}

REQUESTED OUTPUT FORMAT:
${formatType.toUpperCase()}

Follow these rules in order:

1. PRESERVE REAL DATA
- Use only information actually present in the raw payload.
- Never invent, infer, fabricate, or modify factual values.
- Do not create values that are not available in the payload.

2. FOLLOW USER INTENT
- First determine what information the user explicitly requested.
- The user's requested fields have priority over the connector's internal field names.
- Do not blindly expose every field returned by the connector.
- Select and transform fields from the payload so they correspond to the user's requested information.
- If multiple source fields represent the same requested concept, choose the most appropriate available field.
- If a requested value is unavailable, leave it empty rather than inventing it.

3. NORMALIZE CONNECTOR OUTPUT
- Connector APIs may use technical, inconsistent, nested, or provider-specific field names.
- Translate source fields into human-readable fields based on their semantic meaning.
- Do not expose provider-specific implementation details unless the user requested them.
- Remove internal/system fields such as identifiers, connection metadata, organization metadata, credentials, execution metadata, and other fields that are not relevant to the user's request.
- Do not assume a fixed connector schema.

4. HANDLE COLLECTIONS
- If the payload contains a collection of records, identify the actual record collection regardless of its property name.
- Preserve the requested number of records when possible.
- Do not duplicate records.
- If the same logical record appears multiple times in the payload, output it only once.
- Prefer a stable identifier when available for detecting duplicates.
- If no identifier exists, use the combination of meaningful record attributes to detect obvious duplicates.
- Do not remove records merely because two records have similar values unless they are clearly duplicates.

5. MAP REQUESTED INFORMATION SEMANTICALLY
When the user asks for information using natural language, map it to the corresponding available payload values.

For example, if the user requests:
- sender → use the available sender/from/person identity information
- sender name → use the sender's display/name portion when available
- sender email → use the sender's email address when available
- received time/timestamp → use the available received/date/timestamp value
- title → use the available subject/title/name value
- body/snippet/preview → use the most relevant available body, content, snippet, preview, or description value

These are semantic examples, not fixed schemas. Apply the same reasoning to any connector or data type.

6. OUTPUT FORMAT

${outputFormatInstruction}

7. CSV-SPECIFIC RULES
When CSV is requested:

- Output only valid CSV.
- Do not output markdown.
- Do not output explanations.
- Do not output code fences.
- The first row must contain the final user-facing column names.
- Column names must represent the information requested by the user, not raw API field names, unless the user explicitly asks for raw fields.
- Include one row per unique logical record.
- Preserve the original values accurately.
- Properly escape fields containing commas, quotes, line breaks, or other CSV-sensitive characters.
- Use RFC-compatible CSV quoting: fields containing special characters must be enclosed in double quotes and internal double quotes must be escaped by doubling them.
- Keep column ordering aligned with the order requested by the user whenever practical.

8. TABLE-SPECIFIC RULES
When a table is requested:
- Use a markdown table.
- Use human-readable column names.
- Include only fields relevant to the user's request.
- Do not expose internal connector metadata.
- One row represents one unique logical record.

9. JSON-SPECIFIC RULES
When JSON is requested:
- Return valid JSON only.
- Do not return markdown code fences.
- Use meaningful user-facing property names when the user requested specific fields.
- Preserve the underlying values.
- Remove irrelevant internal metadata unless explicitly requested.
- Return an object or array appropriate to the source data.

10. SUMMARY/TEXT/PDF RULES
- Present the information in a concise, readable structure.
- Prioritize the information explicitly requested by the user.
- Do not dump the entire raw payload.
- Do not mention internal processing unless relevant to the user's request.

11. EXECUTION / ACTION RESULTS
If the payload represents an execution plan, workflow, tool execution, or completed action:
- Explain the actual actions represented by the payload.
- Do not expose internal execution identifiers unless requested.
- If the payload contains a generated/saved file result, report the actual filename/path/status available in the payload.
- Do not claim that an action succeeded unless the payload contains evidence of success.

12. MISSING OR AMBIGUOUS DATA
- Never guess missing information.
- Use an empty value where the requested format supports it.
- If the user's requested output cannot be produced from the available payload, return the closest valid representation using only available data.

13. NO HARDCODED CONNECTOR ASSUMPTIONS
- Do not assume the data came from Gmail, Slack, LinkedIn, GitHub, a database, or any particular provider unless the payload or user instruction establishes that.
- Do not rely on fixed provider-specific field names.
- The same formatting logic must work across different AutoFlow connectors.

14. OUTPUT QUALITY
- Be concise.
- Do not repeat records.
- Do not add generic introductions or conclusions.
- Do not expose reasoning.
- Do not describe these formatting rules.
- Return only the requested formatted result.`;

    const userPrompt = `Here is the raw data to format:\n\n${rawStr.slice(0, 6000)}`;

    const prov = providerId || 'groq';
    const mod = modelId || 'openai/gpt-oss-120b';

    try {
      const aiResult = await AIRuntimeService.testPrompt(prov, mod, systemPrompt, {}, userPrompt);
      return this.cleanAiOutput(aiResult.content, formatType);
    } catch {
      // Retry with Gemini Flash as fallback
      try {
        const aiResult = await AIRuntimeService.testPrompt('gemini', 'gemini-3.5-flash-lite', systemPrompt, {}, userPrompt);
        return this.cleanAiOutput(aiResult.content, formatType);
      } catch (e2: any) {
        throw new Error(`Both LLM providers failed: ${e2.message}`);
      }
    }
  }

  /**
   * Strip LLM-specific noise from the output.
   */
  private static cleanAiOutput(content: string, formatType: string): string {
    // Remove <think>...</think> from reasoning models
    let clean = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // For CSV format: strip markdown code block wrappers (```csv ... ```)
    if (formatType === 'csv') {
      clean = clean.replace(/^```(?:csv)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    // For JSON format: strip markdown code block wrappers
    if (formatType === 'json') {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    return clean;
  }

  /**
   * Classify the type of data in the raw payload for better LLM context.
   */
  private static classifyDataType(raw: any): string {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // Execution plan
      if (Array.isArray(parsed?.plan) && parsed.plan[0]?.connectorId) return 'Execution Plan (multi-step connector workflow)';
      if (Array.isArray(parsed) && parsed[0]?.connectorId && parsed[0]?.actionId) return 'Execution Plan steps array';

      // Email data
      const emailArr = parsed?.emails || parsed?.messages || (Array.isArray(parsed) && parsed[0]?.subject ? parsed : null);
      if (emailArr) return 'Email list data (from Gmail or mail connector)';

      // File/storage result
      if (parsed?.saved || parsed?.path || parsed?.file_path || parsed?.fileName) return 'File save confirmation (from Data Vault or storage)';

      // Search results
      if (parsed?.results && parsed.results[0]?.url) return 'Web search results';

      // Step execution results
      if (parsed?.stepResults || parsed?.stepsCompleted !== undefined) return 'Plan execution results (step-by-step connector outputs)';

      // Generic array data
      if (Array.isArray(parsed) && parsed.length > 0) return `Array of ${parsed.length} data records`;
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) return `Array of ${parsed.data.length} data records`;

      // Generic object
      if (typeof parsed === 'object' && parsed !== null) return 'Structured API/connector response object';

      return 'Text or unstructured output';
    } catch {
      return 'Raw text output';
    }
  }

  /**
   * Returns a format-specific instruction sentence for the LLM prompt.
   */
  private static getFormatInstruction(formatType: string): string {
    switch (formatType) {
      case 'csv':
        return `OUTPUT FORMAT: Produce valid RFC-compatible CSV only.
The first row must contain human-readable column names based on the user's requested information.
Use one row per unique logical record.
Map the user's requested concepts to the corresponding values in the raw data.
Do not simply copy the raw API schema.
Do not include irrelevant technical fields.
Do not use markdown, code fences, explanations, or commentary.
Properly quote fields containing commas, quotes, or line breaks.`;
      case 'table':
        return `OUTPUT FORMAT: Produce a clean markdown table.
Create columns based on the information explicitly requested by the user.
Use human-readable column names rather than raw connector field names where appropriate.
Include only relevant fields.
Use one row per unique logical record.`;

      case 'json':
        return `OUTPUT FORMAT: Return valid JSON only.
Map the user's requested information to JSON properties.
Use human-readable property names that correspond to the user's intent.
Do not expose internal connector field names unless the user explicitly requested them.
Do not include raw metadata fields unless requested.
Preserve the values exactly as they appear in the raw data.
Return an object or array as appropriate to the source data.
Do not include markdown, explanations, or code fences.`;

      case 'summary':
        return `OUTPUT FORMAT: Write a structured, clear, and concise summary in markdown.
Start with a title that reflects the user's request.
Use section headers for clarity.
Use bullet points or numbered lists to present key information.
Prioritize the information the user explicitly asked for.
Do not include irrelevant metadata or internal implementation details unless they are essential to the user's request.
Do not add conversational filler or meta-commentary.`;

      case 'pdf':
        return `OUTPUT FORMAT: Write structured markdown content suitable for PDF export.
Include a main title.
Use clear section headers and subheaders.
Use bullet points and short paragraphs for readability.
Organize the content logically based on the user's request.
Do not include unnecessary technical details unless the user requested them.
Do not add conversational filler.`;


      default:
        return 'OUTPUT FORMAT: Write a clear, friendly natural language response that directly answers the user\'s request. Use bullet points or numbered lists where appropriate for readability.';
    }
  }

  /**
   * Deterministic rule-based fallback formatter — used when LLM is unavailable.
   * 100% dynamic parsing, zero hardcoded strings.
   */
  static formatDeterministic(raw: any, instruction: string, formatType: string): string {
    let parsed = raw;
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch { parsed = raw; }
    }

    // Helper: find first meaningful array in any object
    const findArray = (obj: any): any[] | null => {
      if (Array.isArray(obj)) return obj;
      if (typeof obj !== 'object' || obj === null) return null;
      const ARRAY_KEYS = ['emails', 'messages', 'results', 'rows', 'items', 'data', 'records', 'list', 'output', 'plan'];
      for (const k of ARRAY_KEYS) {
        if (Array.isArray(obj[k]) && obj[k].length > 0) return obj[k];
      }
      // Deep search one level
      for (const val of Object.values(obj)) {
        if (Array.isArray(val) && (val as any[]).length > 0) return val as any[];
      }
      return null;
    };

    const dataArray = findArray(parsed);

    // ── Execution Plan handling ─────────────────────────────────────────────
    const isPlan = Array.isArray(parsed?.plan) ||
      (dataArray && dataArray[0]?.connectorId && dataArray[0]?.actionId);

    if (isPlan && dataArray) {
      if (['summary', 'text', 'pdf', 'table'].includes(formatType)) {
        let text = `### 📋 Execution Workflow Plan\n\nThis plan will execute **${dataArray.length} connector step${dataArray.length > 1 ? 's' : ''}**:\n\n`;
        dataArray.forEach((step: any, idx: number) => {
          const name = step.description || `${step.connectorId} → ${step.actionId}`;
          text += `**Step ${idx + 1}: ${name}**\n`;
          if (step.connectorId) text += `- **Connector:** \`${step.connectorId}\` action: \`${step.actionId}\`\n`;
          if (step.inputs && Object.keys(step.inputs).length > 0) {
            const inputSummary = Object.entries(step.inputs)
              .filter(([, v]) => v !== undefined && v !== null && v !== '')
              .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : v}`)
              .join(', ');
            if (inputSummary) text += `- **Inputs:** ${inputSummary}\n`;
          }
          text += '\n';
        });
        return text.trim();
      }

      if (formatType === 'csv') {
        const headers = ['step', 'connector', 'action', 'description'];
        const rows = dataArray.map((s: any, i: number) =>
          [i + 1, s.connectorId || '', s.actionId || '', s.description || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      }

      if (formatType === 'json') {
        return JSON.stringify(dataArray, null, 2);
      }
    }

    // ── CSV output ────────────────────────────────────────────────────────────
    if (formatType === 'csv') {
      const arr = dataArray;
      if (arr && arr.length > 0 && typeof arr[0] === 'object') {
        const keys = Object.keys(arr[0]).filter(k =>
          !['_id', '__v', 'organizationId', 'connectionId', 'stepId', 'encryptedCredentials'].includes(k)
        );
        const header = keys.join(',');
        const rows = arr.map((row: any) =>
          keys.map(k => `"${String(row[k] !== undefined ? row[k] : '').replace(/"/g, '""')}"`).join(',')
        );
        return [header, ...rows].join('\n');
      }
      if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed).filter(k => !['_id', '__v', 'organizationId'].includes(k));
        const header = keys.join(',');
        const vals = keys.map(k => `"${String(typeof parsed[k] === 'object' ? JSON.stringify(parsed[k]) : parsed[k]).replace(/"/g, '""')}"`).join(',');
        return `${header}\n${vals}`;
      }
      return `Output\n"${String(parsed).replace(/"/g, '""')}"`;
    }

    // ── Table output ──────────────────────────────────────────────────────────
    if (formatType === 'table') {
      const arr = dataArray;
      if (arr && arr.length > 0 && typeof arr[0] === 'object') {
        const keys = Object.keys(arr[0]).filter(k =>
          !['_id', '__v', 'organizationId', 'connectionId', 'stepId', 'encryptedCredentials'].includes(k)
        );
        const header = `| ${keys.join(' | ')} |`;
        const sep = `| ${keys.map(() => '---').join(' | ')} |`;
        const rows = arr.map((row: any) =>
          `| ${keys.map(k => String(row[k] !== undefined ? row[k] : '').replace(/\|/g, '\\|')).join(' | ')} |`
        );
        return [header, sep, ...rows].join('\n');
      }
      if (typeof parsed === 'object' && parsed !== null) {
        const rows = Object.entries(parsed)
          .filter(([k]) => !['_id', '__v', 'organizationId'].includes(k))
          .map(([k, v]) => `| ${k} | ${typeof v === 'object' ? JSON.stringify(v).slice(0, 100) : v} |`);
        return `| Key | Value |\n|---|---|\n${rows.join('\n')}`;
      }
      return `| Output |\n|---|\n| ${String(parsed)} |`;
    }

    // ── JSON output ───────────────────────────────────────────────────────────
    if (formatType === 'json') {
      return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : JSON.stringify({ output: parsed }, null, 2);
    }

    // ── Default text / summary / pdf ──────────────────────────────────────────
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.conversationalMessage) return String(parsed.conversationalMessage);

      if (dataArray && dataArray.length > 0) {
        const title = this.generateTitleFromInstruction(instruction, raw);
        let text = `### ${title}\n\n`;
        dataArray.forEach((item: any, idx: number) => {
          if (typeof item === 'object' && item !== null) {
            const cleanItem = Object.fromEntries(
              Object.entries(item).filter(([k]) =>
                !['_id', '__v', 'organizationId', 'connectionId', 'stepId', 'encryptedCredentials'].includes(k)
              )
            );
            text += `**${idx + 1}.** `;
            const entries = Object.entries(cleanItem);
            if (entries.length > 0) {
              // First key as primary label
              const [firstKey, firstVal] = entries[0];
              text += `${String(firstVal)}\n`;
              entries.slice(1).forEach(([k, v]) => {
                text += `   - **${k}:** ${typeof v === 'object' ? JSON.stringify(v).slice(0, 100) : v}\n`;
              });
            }
            text += '\n';
          } else {
            text += `- ${item}\n`;
          }
        });
        return text.trim();
      }

      // Single object: flatten to readable key-value
      const cleanParsed = Object.fromEntries(
        Object.entries(parsed).filter(([k]) =>
          !['_id', '__v', 'organizationId', 'connectionId', 'encryptedCredentials'].includes(k)
        )
      );
      return Object.entries(cleanParsed)
        .map(([k, v]) => `**${k}:** ${typeof v === 'object' ? JSON.stringify(v).slice(0, 200) : v}`)
        .join('\n');
    }

    return String(parsed);
  }
}
