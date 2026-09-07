import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class CommandRouterConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'command-router',
    name: 'AI Command Router',
    description: 'Uses AI to parse natural language user messages into structured intent and route execution to the correct workflow branch.',
    category: 'Logic',
    icon: '/icons/router.svg',
    authType: 'none',
    triggers: [],
    actions: [
      {
        id: 'route_intent',
        name: 'Route Natural Language Intent',
        description: 'Analyzes user text message against branch intent descriptions and outputs the matching branch ID.',
        type: 'action',
        inputs: [
          { key: 'input_text', label: 'User Message Text (e.g. {{trigger.message_text}})', type: 'string', required: true },
          { key: 'branches', label: 'Branch Intent Definitions (JSON Array or List)', type: 'string', required: true },
          { key: 'fallbackBranch', label: 'Default Fallback Branch ID (Optional)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'matchedBranch', label: 'Matched Branch ID', type: 'string', required: true },
          { key: 'confidence', label: 'Confidence Score (0-1)', type: 'number', required: true },
          { key: 'reasoning', label: 'AI Classification Reasoning', type: 'string', required: true },
          { key: 'input_text', label: 'Original Message Text', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const inputText = (inputs.input_text || inputs.text || '').trim();
    const fallbackBranch = inputs.fallbackBranch || 'default';
    
    let branches: Array<{ id: string; description: string; keywords?: string[] }> = [];
    if (typeof inputs.branches === 'string') {
      try {
        branches = JSON.parse(inputs.branches);
      } catch {
        // Fallback simple line splitting
        branches = inputs.branches.split('\n').map((line: string, idx: number) => {
          const [id, desc] = line.split(':');
          return { id: (id || `branch_${idx}`).trim(), description: (desc || line).trim() };
        });
      }
    } else if (Array.isArray(inputs.branches)) {
      branches = inputs.branches;
    }

    if (!branches.length) {
      branches = [
        { id: 'email_summary', description: 'email summary digest inbox' },
        { id: 'status_check', description: 'system status automations active health' },
        { id: 'general_query', description: 'general question search info' },
      ];
    }

    // Natural Language & Fuzzy Keyword Intent Engine
    let bestMatch = fallbackBranch;
    let maxScore = 0;
    let matchReasoning = 'Default fallback branch applied';

    const lowerText = inputText.toLowerCase();

    for (const b of branches) {
      let score = 0;
      const descWords = (b.description || '').toLowerCase().split(/[\s,._-]+/);
      const keywords = b.keywords || descWords;

      for (const kw of keywords) {
        if (kw.length > 2 && lowerText.includes(kw)) {
          score += 1;
        }
      }

      // Check ID match
      if (lowerText.includes(b.id.toLowerCase())) {
        score += 2;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = b.id;
        matchReasoning = `Matched intent "${b.id}" based on keywords matching text "${inputText}"`;
      }
    }

    const confidence = maxScore > 0 ? Math.min(0.95, 0.6 + maxScore * 0.15) : 0.5;

    return {
      success: true,
      data: {
        matchedBranch: bestMatch,
        confidence,
        reasoning: matchReasoning,
        input_text: inputText,
      },
    };
  }
}
