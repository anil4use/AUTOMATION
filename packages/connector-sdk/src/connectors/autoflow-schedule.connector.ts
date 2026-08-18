import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class AutoFlowScheduleConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'autoflow-schedule',
    name: 'AutoFlow Schedule & Event Trigger',
    description: 'Default trigger node: Execute workflows on time intervals, specific dates, weekly schedules, cron rules, or webhooks.',
    category: 'Core Triggers',
    icon: '/icons/autoflow-trigger.svg',
    authType: 'none',
    triggers: [
      {
        id: 'schedule_time',
        name: 'Time Interval (Every N mins/hours/days)',
        description: 'Triggers on a recurring time interval (e.g., every 15 minutes, every 2 hours, daily at 9am).',
        type: 'trigger',
        inputs: [
          { key: 'intervalType', label: 'Interval Unit', type: 'select', required: true },
          { key: 'intervalValue', label: 'Interval Value', type: 'number', required: true },
          { key: 'timeOfDay', label: 'Time of Day (HH:mm)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'triggeredAt', label: 'Trigger Timestamp', type: 'string', required: true },
          { key: 'runId', label: 'Execution Run ID', type: 'string', required: true },
        ],
      },
      {
        id: 'schedule_date',
        name: 'Specific Date & Time',
        description: 'Triggers once at an exact target date and time.',
        type: 'trigger',
        inputs: [{ key: 'targetDateTime', label: 'Target Date & Time (ISO)', type: 'string', required: true }],
        outputs: [
          { key: 'triggeredAt', label: 'Trigger Timestamp', type: 'string', required: true },
          { key: 'targetDate', label: 'Scheduled Date', type: 'string', required: true },
        ],
      },
      {
        id: 'schedule_weekly',
        name: 'Weekly Schedule (Select Days & Time)',
        description: 'Triggers weekly on selected days (e.g. Every Monday & Friday at 8:00 AM).',
        type: 'trigger',
        inputs: [
          { key: 'selectedDays', label: 'Selected Days (Mon,Wed,Fri)', type: 'string', required: true },
          { key: 'executionTime', label: 'Execution Time (HH:mm)', type: 'string', required: true },
        ],
        outputs: [
          { key: 'triggeredAt', label: 'Trigger Timestamp', type: 'string', required: true },
          { key: 'dayOfWeek', label: 'Day of Week', type: 'string', required: true },
        ],
      },
      {
        id: 'schedule_cron',
        name: 'Custom Cron Expression',
        description: 'Triggers based on a standard 5-field cron expression (e.g., 0 9 * * 1-5).',
        type: 'trigger',
        inputs: [{ key: 'cronExpression', label: 'Cron Expression', type: 'string', required: true }],
        outputs: [
          { key: 'triggeredAt', label: 'Trigger Timestamp', type: 'string', required: true },
          { key: 'cronPattern', label: 'Cron Pattern', type: 'string', required: true },
        ],
      },
      {
        id: 'inbound_webhook',
        name: 'Instant Webhook Trigger',
        description: 'Triggers instantly whenever an external HTTP POST request hits your custom webhook endpoint.',
        type: 'trigger',
        inputs: [{ key: 'webhookPath', label: 'Custom Webhook Path', type: 'string', required: true }],
        outputs: [
          { key: 'payload', label: 'Webhook JSON Payload', type: 'object', required: true },
          { key: 'headers', label: 'HTTP Request Headers', type: 'object', required: true },
        ],
      },
    ],
    actions: [],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    return {
      success: true,
      data: {
        triggeredAt: new Date().toISOString(),
        runId: `run_${Date.now()}`,
      },
    };
  }
}
