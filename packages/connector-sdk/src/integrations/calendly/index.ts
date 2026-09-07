import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getCalendlyChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const calendlyManifest: ConnectorManifest = {
  id: 'calendly',
  name: 'Calendly',
  description: 'Full-power Calendly integration — Monitor booked meetings, rescheduled events, cancellations & trigger automations on appointment webhooks.',
  category: 'Scheduling & Productivity',
  icon: '/icons/calendly.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'invitee_created',
      name: 'Meeting Booked',
      description: 'Triggers when a customer schedules a new meeting on Calendly.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'event_uri', label: 'Event URI', type: 'string', required: true },
        { key: 'invitee_email', label: 'Invitee Email', type: 'string', required: true },
        { key: 'invitee_name', label: 'Invitee Name', type: 'string', required: true },
        { key: 'start_time', label: 'Event Start Time', type: 'string', required: true },
        { key: 'event_type_name', label: 'Event Type Name', type: 'string', required: true },
      ],
    },
    {
      id: 'invitee_canceled',
      name: 'Meeting Cancelled',
      description: 'Triggers when an invitee cancels a scheduled appointment.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'event_uri', label: 'Event URI', type: 'string', required: true },
        { key: 'invitee_email', label: 'Invitee Email', type: 'string', required: true },
        { key: 'cancellation_reason', label: 'Cancellation Reason', type: 'string', required: false },
      ],
    },
  ],
  actions: [
    {
      id: 'get_event_details',
      name: 'Get Scheduled Event Details',
      description: 'Fetches details and invitees for a scheduled Calendly event.',
      type: 'action',
      inputs: [
        { key: 'event_uuid', label: 'Event UUID or URI', type: 'string', required: true },
      ],
      outputs: [
        { key: 'name', label: 'Event Name', type: 'string', required: true },
        { key: 'start_time', label: 'Start Time', type: 'string', required: true },
        { key: 'end_time', label: 'End Time', type: 'string', required: true },
        { key: 'status', label: 'Event Status', type: 'string', required: true },
      ],
    },
    {
      id: 'cancel_event',
      name: 'Cancel Scheduled Event',
      description: 'Cancels an existing appointment.',
      type: 'action',
      inputs: [
        { key: 'event_uuid', label: 'Event UUID or URI', type: 'string', required: true },
        { key: 'reason', label: 'Cancellation Reason', type: 'string', required: false },
      ],
      outputs: [
        { key: 'status', label: 'Status', type: 'string', required: true },
      ],
    },
  ],
};

export class CalendlyConnector extends BaseConnector {
  manifest = calendlyManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey || credentials.token;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Calendly access token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      const cleanUuid = (inputs.event_uuid || '').split('/').pop();

      if (actionId === 'get_event_details') {
        const url = `https://api.calendly.com/scheduled_events/${cleanUuid}`;
        const res = await axios.get(url, { headers });
        const resource = res.data?.resource || {};
        return {
          success: true,
          data: {
            name: resource.name,
            start_time: resource.start_time,
            end_time: resource.end_time,
            status: resource.status,
          },
        };
      }

      if (actionId === 'cancel_event') {
        const url = `https://api.calendly.com/scheduled_events/${cleanUuid}/cancellation`;
        const body = { reason: inputs.reason || 'Cancelled via AutoFlow' };
        await axios.post(url, body, { headers });
        return { success: true, data: { status: 'canceled' } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getCalendlyChoices(fieldId, credentials);
  }
}

manifestRegistry.register(calendlyManifest);
