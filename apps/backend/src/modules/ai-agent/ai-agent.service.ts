import { logger } from '../../config/logger';

export class AIAgentService {
  static async generateWorkflow(prompt: string, orgId: string) {
    logger.info(`[AIAgentService] Generating DAG for prompt: "${prompt}"`);

    const isSlack = prompt.toLowerCase().includes('slack');
    const isGmail = prompt.toLowerCase().includes('gmail') || prompt.toLowerCase().includes('email');

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
        name: 'AI Text Processing',
        config: { prompt: 'Summarize the input text into key points.' },
        fieldMapping: { inputText: `{{nodes.${triggerId}.output.body}}` },
        position: { x: 400, y: 150 },
      },
      {
        id: actionId,
        type: 'action',
        connectorId: isSlack ? 'slack' : 'gmail',
        operationId: isSlack ? 'send_message' : 'send_email',
        name: isSlack ? 'Post to Slack' : 'Send Email',
        config: { channel: '#general' },
        fieldMapping: { text: `{{nodes.${aiNodeId}.output.result}}` },
        position: { x: 700, y: 150 },
      },
    ];

    const edges = [
      { id: `e_${triggerId}_${aiNodeId}`, source: triggerId, target: aiNodeId },
      { id: `e_${aiNodeId}_${actionId}`, source: aiNodeId, target: actionId },
    ];

    return {
      draftWorkflow: {
        name: `AI Generated: ${prompt.slice(0, 30)}`,
        description: `Generated from prompt: "${prompt}"`,
        nodes,
        edges,
      },
    };
  }
}
