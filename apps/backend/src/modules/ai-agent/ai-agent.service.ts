import { GenerateWorkflowResponseData } from '@automation/shared-types';
import { logger } from '../../config/logger';

export class AIAgentService {
  static async generateWorkflow(prompt: string, orgId: string): Promise<GenerateWorkflowResponseData> {
    logger.info(`[AIAgentService] Generating DAG for prompt: "${prompt}" in org: ${orgId}`);

    const lowerPrompt = prompt.toLowerCase();
    const isSlack = lowerPrompt.includes('slack');
    const isGmail = lowerPrompt.includes('gmail') || lowerPrompt.includes('email');
    const isSheets = lowerPrompt.includes('sheet') || lowerPrompt.includes('google sheet');

    // Ambiguity Check: "notify me" without channel specification
    let clarificationNeeded: string | undefined = undefined;
    if (lowerPrompt.includes('notify me') && !isSlack && !isGmail) {
      clarificationNeeded = 'Which channel or app would you like to receive notifications on? (e.g., Slack channel or Email address)';
    }

    const triggerId = 'trigger_1';
    const aiNodeId = 'ai_node_1';
    const actionId = 'action_1';

    const nodes = [
      {
        id: triggerId,
        type: 'trigger',
        connectorId: isGmail ? 'gmail' : 'google-sheets',
        operationId: isGmail ? 'new_email' : 'new_row',
        name: isGmail ? 'New Email Trigger' : 'New Sheet Row Trigger',
        config: {},
        fieldMapping: {},
        position: { x: 100, y: 150 },
      },
      {
        id: aiNodeId,
        type: 'ai-agent',
        connectorId: 'ai-agent',
        operationId: 'process_text',
        name: 'AI Summarize Step',
        config: { prompt: 'Summarize the input text into 2 key points.' },
        fieldMapping: { inputText: `{{nodes.${triggerId}.output.body || nodes.${triggerId}.output.rowValues}}` },
        position: { x: 400, y: 150 },
      },
      {
        id: actionId,
        type: 'action',
        connectorId: isSlack ? 'slack' : 'gmail',
        operationId: isSlack ? 'send_message' : 'send_email',
        name: isSlack ? 'Post to Slack' : 'Send Summary Email',
        config: { channel: '#general' },
        fieldMapping: { text: `{{nodes.${aiNodeId}.output.result}}` },
        position: { x: 700, y: 150 },
      },
    ];

    const edges = [
      { id: `e_${triggerId}_${aiNodeId}`, source: triggerId, target: aiNodeId },
      { id: `e_${aiNodeId}_${actionId}`, source: aiNodeId, target: actionId },
    ];

    const missingConnectors = [];
    if (isGmail) missingConnectors.push('gmail');
    if (isSlack) missingConnectors.push('slack');

    return {
      draftWorkflow: {
        name: `AI Draft: ${prompt.slice(0, 35)}...`,
        description: `Generated from natural language prompt: "${prompt}"`,
        nodes,
        edges,
      },
      missingConnectors,
      clarificationNeeded,
    };
  }
}
