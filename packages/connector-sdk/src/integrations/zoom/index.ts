import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getZoomChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const zoomManifest: ConnectorManifest = {
  id: 'zoom',
  name: 'Zoom',
  description: 'Full-power Zoom integration — Create & schedule meetings, manage registrants, fetch cloud recordings & trigger automations on real-time meeting webhooks.',
  category: 'Communication',
  icon: '/icons/zoom.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'meeting_created',
      name: 'Meeting Created',
      description: 'Triggers when a new meeting is scheduled in your Zoom account.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'meetingId', label: 'Meeting ID', type: 'string', required: true },
        { key: 'topic', label: 'Meeting Topic', type: 'string', required: true },
        { key: 'joinUrl', label: 'Participant Join URL', type: 'string', required: true },
        { key: 'startTime', label: 'Start Time', type: 'string', required: true },
      ],
    },
    {
      id: 'recording_completed',
      name: 'Recording Completed',
      description: 'Triggers when a cloud recording finishes processing.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'meetingId', label: 'Meeting ID', type: 'string', required: true },
        { key: 'topic', label: 'Meeting Topic', type: 'string', required: true },
        { key: 'downloadUrl', label: 'Recording Download URL', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_meeting',
      name: 'Create Meeting',
      description: 'Schedules a new video conference meeting.',
      type: 'action',
      inputs: [
        { key: 'userId', label: 'Host User (Default: me)', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'userId' } },
        { key: 'topic', label: 'Meeting Title / Topic', type: 'string', required: true },
        { key: 'type', label: 'Meeting Type (1: Instant, 2: Scheduled)', type: 'number', required: false },
        { key: 'startTime', label: 'Start Time (ISO string)', type: 'string', required: true },
        { key: 'duration', label: 'Duration (Minutes)', type: 'number', required: true },
        { key: 'agenda', label: 'Meeting Agenda Description', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Meeting ID', type: 'number', required: true },
        { key: 'join_url', label: 'Join URL', type: 'string', required: true },
        { key: 'start_url', label: 'Host Start URL', type: 'string', required: true },
        { key: 'password', label: 'Passcode', type: 'string', required: false },
      ],
    },
    {
      id: 'add_registrant',
      name: 'Add Meeting Registrant',
      description: 'Registers a participant for a scheduled meeting.',
      type: 'action',
      inputs: [
        { key: 'meetingId', label: 'Meeting ID', type: 'string', required: true },
        { key: 'email', label: 'Registrant Email', type: 'string', required: true },
        { key: 'first_name', label: 'First Name', type: 'string', required: true },
        { key: 'last_name', label: 'Last Name', type: 'string', required: false },
      ],
      outputs: [
        { key: 'registrant_id', label: 'Registrant ID', type: 'string', required: true },
        { key: 'join_url', label: 'Personal Join URL', type: 'string', required: true },
      ],
    },
  ],
};

export class ZoomConnector extends BaseConnector {
  manifest = zoomManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey || credentials.token;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Zoom access token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'create_meeting') {
        const userId = inputs.userId || 'me';
        const url = `https://api.zoom.us/v2/users/${userId}/meetings`;
        const body = {
          topic: inputs.topic,
          type: inputs.type || 2,
          start_time: inputs.startTime,
          duration: inputs.duration,
          agenda: inputs.agenda || '',
        };
        const res = await axios.post(url, body, { headers });
        return {
          success: true,
          data: {
            id: res.data.id,
            join_url: res.data.join_url,
            start_url: res.data.start_url,
            password: res.data.password,
          },
        };
      }

      if (actionId === 'add_registrant') {
        const url = `https://api.zoom.us/v2/meetings/${inputs.meetingId}/registrants`;
        const body = { email: inputs.email, first_name: inputs.first_name, last_name: inputs.last_name || '' };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { registrant_id: res.data.registrant_id, join_url: res.data.join_url } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getZoomChoices(fieldId, credentials);
  }
}

manifestRegistry.register(zoomManifest);
