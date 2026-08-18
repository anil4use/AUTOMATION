import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class SlackConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'slack',
    name: 'Slack',
    description: 'Post messages to channels, send DMs, and listen for channel events.',
    category: 'Communication',
    icon: '/icons/slack.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_channel_message',
        name: 'New Channel Message',
        description: 'Triggers when a message is posted to a specific channel.',
        type: 'trigger',
        inputs: [{ key: 'channel', label: 'Channel ID', type: 'string', required: true }],
        outputs: [
          { key: 'user', label: 'User ID', type: 'string', required: true },
          { key: 'text', label: 'Message Text', type: 'string', required: true },
          { key: 'ts', label: 'Timestamp', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'send_message',
        name: 'Post Channel Message',
        description: 'Posts a message to a Slack channel.',
        type: 'action',
        inputs: [
          { key: 'channel', label: 'Channel ID', type: 'string', required: true },
          { key: 'text', label: 'Message Text', type: 'string', required: true },
        ],
        outputs: [{ key: 'ts', label: 'Message Timestamp', type: 'string', required: true }],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    if (actionId === 'send_message') {
      return {
        success: true,
        data: { ts: `${Date.now()}`, channel: context.stepInput.channel, text: context.stepInput.text },
      };
    }
    throw new Error(`Unsupported action: ${actionId}`);
  }
}
