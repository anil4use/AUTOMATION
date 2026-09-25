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
   * Main entry point to sanitize, normalize, and format AI/API outputs into human-readable results.
   */
  static async format(options: FormatResponseOptions): Promise<FormattedResponseResult> {
    const { rawResponse, userInstruction = '', requestedFormat = 'auto', providerId, modelId } = options;

    const detectedFormat = this.detectTargetFormat(userInstruction, requestedFormat);
    const summaryTitle = this.generateTitleFromInstruction(userInstruction, rawResponse);

    // 1. Try AI-powered intelligent response analyzer & formatter
    try {
      const aiResult = await this.formatWithAI(rawResponse, userInstruction, detectedFormat, providerId, modelId);
      if (aiResult && aiResult.trim()) {
        return {
          formattedContent: aiResult,
          formatType: detectedFormat,
          summaryTitle,
          isNormalized: true,
          rawOriginal: rawResponse,
        };
      }
    } catch (err: any) {
      logger.warn(`[AIResponseFormatter] AI formatting fell back to deterministic rules: ${err.message}`);
    }

    // 2. Fallback to robust deterministic rule-based formatter
    const fallbackFormatted = this.formatDeterministic(rawResponse, userInstruction, detectedFormat);
    return {
      formattedContent: fallbackFormatted,
      formatType: detectedFormat,
      summaryTitle,
      isNormalized: true,
      rawOriginal: rawResponse,
    };
  }

  /**
   * Detect requested output format from user query keywords or explicit option
   */
  private static detectTargetFormat(instruction: string, requested: string): 'summary' | 'pdf' | 'table' | 'csv' | 'json' | 'text' {
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
   * Derive a clean, human-readable title from user instruction or raw response context
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
   * Use AIRuntimeService LLM to perform natural language response normalization
   */
  private static async formatWithAI(
    raw: any,
    instruction: string,
    formatType: string,
    providerId?: string,
    modelId?: string
  ): Promise<string> {
    const rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);

    const systemPrompt = `You are the AI Response Formatter for AutoFlow Platform.
Your job is to convert raw execution outputs and system payloads into clean, user-facing responses.

CRITICAL RULES:
1. ONLY use the actual facts, data, keys, and values present in the input payload. NEVER invent, fake, or hardcode fictitious data.
2. If the payload is an Execution Plan (contains "plan" array with connector steps):
   - Format it as a clear step-by-step execution roadmap in natural, readable human language.
   - For each step, highlight what action is taken, which connector is used, and the target output file or parameters.
   - Do NOT just spit out raw JSON code blocks or internal keys like stepId or connectionId.
3. If the payload contains tabular or dataset results:
   - Convert the payload data into the requested format (${formatType.toUpperCase()}):
     - "summary" or "text": Natural, clear Markdown summary based strictly on payload data.
     - "table": Markdown table formatting the payload data rows and columns.
     - "csv": Valid CSV output formatting the actual payload fields into CSV header and rows.
     - "pdf": Structured Markdown formatted for document export.
     - "json": Clean JSON containing only the payload data.

Target Format: ${formatType.toUpperCase()}
User Request Context: "${instruction || 'Format this response'}"`;

    const userPrompt = `Raw AI/API Output Payload:\n${rawStr.slice(0, 4000)}`;

    const prov = providerId || 'groq';
    const mod = modelId || 'openai/gpt-oss-120b';

    try {
      const aiResult = await AIRuntimeService.testPrompt(prov, mod, systemPrompt, {}, userPrompt);
      let content = aiResult.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      return content;
    } catch {
      // Retry with Gemini Flash
      const aiResult = await AIRuntimeService.testPrompt('gemini', 'gemini-3.5-flash-lite', systemPrompt, {}, userPrompt);
      let content = aiResult.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      return content;
    }
  }

  /**
   * Deterministic rule-based fallback formatter when LLM is unavailable — 100% dynamic parsing, 0 hardcoded strings
   */
  private static formatDeterministic(raw: any, instruction: string, formatType: string): string {
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    const findArray = (obj: any): any[] | null => {
      if (Array.isArray(obj)) return obj;
      if (typeof obj === 'object' && obj !== null) {
        for (const k of ['plan', 'results', 'data', 'items', 'emails', 'messages', 'rows', 'output']) {
          if (Array.isArray(obj[k]) && obj[k].length > 0) return obj[k];
        }
      }
      return null;
    };

    const dataArray = findArray(parsed);

    // Special handling if raw output is a Workflow Plan array
    const isPlan = Array.isArray(parsed?.plan) || (dataArray && dataArray[0]?.connectorId && dataArray[0]?.actionId);
    if (isPlan && dataArray) {
      if (formatType === 'summary' || formatType === 'text' || formatType === 'pdf') {
        let text = `### 📋 Execution Workflow Plan\n\n`;
        dataArray.forEach((step: any, idx: number) => {
          const name = step.description || `Step ${idx + 1}: ${step.connectorId} -> ${step.actionId}`;
          text += `**Step ${idx + 1}: ${name}**\n`;
          if (step.connectorId) text += `- **Connector:** \`${step.connectorId}\` (${step.actionId || 'action'})\n`;
          if (step.inputs && Object.keys(step.inputs).length > 0) {
            text += `- **Inputs:** ${JSON.stringify(step.inputs)}\n`;
          }
          text += '\n';
        });
        return text.trim();
      }
    }

    if (formatType === 'csv') {
      if (dataArray && dataArray.length > 0) {
        if (typeof dataArray[0] === 'object' && dataArray[0] !== null) {
          const keys = Object.keys(dataArray[0]);
          const headerLine = keys.join(',');
          const rowLines = dataArray.map((row: any) =>
            keys.map((k) => `"${String(row[k] !== undefined ? row[k] : '').replace(/"/g, '""')}"`).join(',')
          );
          return [headerLine, ...rowLines].join('\n');
        }
        return `Item\n` + dataArray.map((item) => `"${String(item).replace(/"/g, '""')}"`).join('\n');
      }

      if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        const headerLine = keys.join(',');
        const valLine = keys.map((k) => `"${String(typeof parsed[k] === 'object' ? JSON.stringify(parsed[k]) : parsed[k]).replace(/"/g, '""')}"`).join(',');
        return `${headerLine}\n${valLine}`;
      }

      return `Output\n"${String(parsed).replace(/"/g, '""')}"`;
    }

    if (formatType === 'table') {
      if (dataArray && dataArray.length > 0) {
        if (typeof dataArray[0] === 'object' && dataArray[0] !== null) {
          const keys = Object.keys(dataArray[0]);
          const headerLine = `| ${keys.join(' | ')} |`;
          const sepLine = `| ${keys.map(() => '---').join(' | ')} |`;
          const rowLines = dataArray.map((row: any) =>
            `| ${keys.map((k) => String(row[k] !== undefined ? row[k] : '')).join(' | ')} |`
          );
          return [headerLine, sepLine, ...rowLines].join('\n');
        }
        return `| # | Value |\n|---|---|\n` + dataArray.map((item, idx) => `| ${idx + 1} | ${item} |`).join('\n');
      }

      if (typeof parsed === 'object' && parsed !== null) {
        const rows = Object.entries(parsed).map(([k, v]) => `| ${k} | ${typeof v === 'object' ? JSON.stringify(v) : v} |`);
        return `| Key | Value |\n|---|---|\n${rows.join('\n')}`;
      }

      return `| Output |\n|---|\n| ${String(parsed)} |`;
    }

    if (formatType === 'json') {
      return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : JSON.stringify({ output: parsed }, null, 2);
    }

    // Default text / summary / pdf format
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.conversationalMessage) {
        return String(parsed.conversationalMessage);
      }
      if (dataArray && dataArray.length > 0) {
        let text = `### ${this.generateTitleFromInstruction(instruction, raw)}\n\n`;
        dataArray.forEach((item: any, idx: number) => {
          if (typeof item === 'object' && item !== null) {
            text += `**Item ${idx + 1}:**\n`;
            Object.entries(item).forEach(([k, v]) => {
              text += `- **${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
            });
            text += '\n';
          } else {
            text += `- ${item}\n`;
          }
        });
        return text.trim();
      }
    }

    return String(parsed);
  }
}
