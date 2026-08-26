import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class GoogleCalendarConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Real Google Calendar integration — Schedule meetings, create events, and manage calendar schedules.',
    category: 'Productivity',
    icon: '/icons/google-calendar.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_event',
        name: 'New Event Created',
        description: 'Triggers when a new event or meeting is scheduled on your Google Calendar.',
        type: 'trigger',
        inputs: [{ key: 'calendarId', label: 'Calendar ID (Default: primary)', type: 'string', required: false }],
        outputs: [
          { key: 'eventId', label: 'Event ID', type: 'string', required: true },
          { key: 'summary', label: 'Event Title', type: 'string', required: true },
          { key: 'start', label: 'Start Time', type: 'string', required: true },
          { key: 'end', label: 'End Time', type: 'string', required: true },
          { key: 'htmlLink', label: 'Google Calendar Link', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'create_event',
        name: 'Create Calendar Event',
        description: 'Schedules a new meeting or event on your Google Calendar with attendees.',
        type: 'action',
        inputs: [
          { key: 'summary', label: 'Event Title', type: 'string', required: true },
          { key: 'description', label: 'Description / Notes', type: 'string', required: false },
          { key: 'startTime', label: 'Start Time (ISO String e.g. 2026-08-27T10:00:00Z)', type: 'string', required: true },
          { key: 'endTime', label: 'End Time (ISO String e.g. 2026-08-27T11:00:00Z)', type: 'string', required: true },
          { key: 'attendees', label: 'Attendees (Comma-separated Emails)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'eventId', label: 'Event ID', type: 'string', required: true },
          { key: 'summary', label: 'Event Title', type: 'string', required: true },
          { key: 'htmlLink', label: 'Calendar Link', type: 'string', required: true },
          { key: 'status', label: 'Status', type: 'string', required: true },
        ],
      },
      {
        id: 'list_events',
        name: 'List Upcoming Events',
        description: 'Retrieves upcoming scheduled events from your Google Calendar.',
        type: 'action',
        inputs: [
          { key: 'maxResults', label: 'Max Events to Return (Default: 10)', type: 'number', required: false },
        ],
        outputs: [
          { key: 'count', label: 'Event Count', type: 'number', required: true },
          { key: 'events', label: 'List of Event Objects', type: 'array', required: true },
        ],
      },
      {
        id: 'delete_event',
        name: 'Delete Event',
        description: 'Removes an event from your Google Calendar.',
        type: 'action',
        inputs: [
          { key: 'eventId', label: 'Event ID to Delete', type: 'string', required: true },
        ],
        outputs: [
          { key: 'eventId', label: 'Event ID', type: 'string', required: true },
          { key: 'status', label: 'Status', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const creds = context.connectionCredentials || {};
    const accessToken = creds.accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    const userEmail = creds.userEmail || creds.email || 'me';

    const token = this.requireAccessToken(accessToken, userEmail);

    // 1. Action: CREATE EVENT
    if (actionId === 'create_event') {
      const { summary, description, startTime, endTime, attendees } = context.stepInput;
      if (!summary || !startTime || !endTime) {
        throw new Error('Google Calendar Create Event error: "summary", "startTime", and "endTime" are required.');
      }

      const attendeeList = typeof attendees === 'string'
        ? attendees.split(',').map((e) => ({ email: e.trim() }))
        : Array.isArray(attendees)
        ? attendees.map((e) => ({ email: typeof e === 'string' ? e.trim() : e.email }))
        : [];

      const body: any = {
        summary,
        description: description || '',
        start: { dateTime: new Date(startTime).toISOString() },
        end: { dateTime: new Date(endTime).toISOString() },
      };
      if (attendeeList.length > 0) body.attendees = attendeeList;

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Calendar Create Error (${res.status}): ${data.error?.message || res.statusText}`);

      return {
        success: true,
        data: {
          eventId: data.id,
          summary: data.summary,
          htmlLink: data.htmlLink || `https://calendar.google.com/calendar/event?eid=${data.id}`,
          status: 'event_created',
        },
      };
    }

    // 2. Action: LIST EVENTS
    if (actionId === 'list_events') {
      const maxResults = Number(context.stepInput.maxResults) || 10;
      const now = new Date().toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Calendar List Error (${res.status}): ${data.error?.message || res.statusText}`);

      const items = data.items || [];
      return {
        success: true,
        data: {
          count: items.length,
          events: items.map((e: any) => ({
            id: e.id,
            summary: e.summary || '(No title)',
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date,
            htmlLink: e.htmlLink,
          })),
        },
      };
    }

    // 3. Action: DELETE EVENT
    if (actionId === 'delete_event') {
      const eventId = context.stepInput.eventId;
      if (!eventId) throw new Error('Google Calendar Delete error: "eventId" is required.');

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(`Google Calendar Delete Error (${res.status}): ${data.error?.message || res.statusText}`);
      }

      return {
        success: true,
        data: {
          eventId,
          status: 'deleted',
        },
      };
    }

    throw new Error(`Unsupported Google Calendar action: ${actionId}`);
  }

  private requireAccessToken(accessToken: string | undefined, userEmail: string): string {
    if (!accessToken || accessToken.startsWith('default_') || accessToken.startsWith('access_token_')) {
      throw new Error(
        `Google Calendar API Error: Account "${userEmail}" is not authenticated with real Google OAuth. Please go to Connectors page and click "Connect Google Calendar" to log in with your Google account.`
      );
    }
    return accessToken;
  }
}
