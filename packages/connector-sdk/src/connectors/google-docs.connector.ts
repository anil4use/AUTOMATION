import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class GoogleDocsConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'google-docs',
    name: 'Google Docs',
    description: 'Real Google Docs integration — Create documents, read content, and append text to Google Docs.',
    category: 'Productivity',
    icon: '/icons/google-docs.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_document',
        name: 'New Document Created',
        description: 'Triggers when a new Google Document is created in your account.',
        type: 'trigger',
        inputs: [],
        outputs: [
          { key: 'documentId', label: 'Document ID', type: 'string', required: true },
          { key: 'title', label: 'Document Title', type: 'string', required: true },
          { key: 'documentUrl', label: 'Google Doc Link', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'create_document',
        name: 'Create Document',
        description: 'Creates a new blank or initial Google Document.',
        type: 'action',
        inputs: [
          { key: 'title', label: 'Document Title', type: 'string', required: true },
          { key: 'initialText', label: 'Initial Content (Optional)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'documentId', label: 'Document ID', type: 'string', required: true },
          { key: 'title', label: 'Document Title', type: 'string', required: true },
          { key: 'documentUrl', label: 'Google Doc Link', type: 'string', required: true },
        ],
      },
      {
        id: 'append_text',
        name: 'Append Text to Document',
        description: 'Appends text or paragraphs to the end of a Google Document.',
        type: 'action',
        inputs: [
          { key: 'documentId', label: 'Document ID or Link', type: 'string', required: true },
          { key: 'text', label: 'Text Content to Append', type: 'string', required: true },
        ],
        outputs: [
          { key: 'documentId', label: 'Document ID', type: 'string', required: true },
          { key: 'status', label: 'Status', type: 'string', required: true },
        ],
      },
      {
        id: 'get_document',
        name: 'Read Document Content',
        description: 'Retrieves title and full text content of a Google Document.',
        type: 'action',
        inputs: [
          { key: 'documentId', label: 'Document ID or Link', type: 'string', required: true },
        ],
        outputs: [
          { key: 'documentId', label: 'Document ID', type: 'string', required: true },
          { key: 'title', label: 'Title', type: 'string', required: true },
          { key: 'content', label: 'Full Text Content', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const creds = context.connectionCredentials || {};
    const accessToken = creds.accessToken || process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    const userEmail = creds.userEmail || creds.email || 'me';

    const token = this.requireAccessToken(accessToken, userEmail);

    // 1. Action: CREATE DOCUMENT
    if (actionId === 'create_document') {
      const title = context.stepInput.title;
      if (!title) throw new Error('Google Docs Create error: "title" is required.');

      const res = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Docs Create Error (${res.status}): ${data.error?.message || res.statusText}`);

      const docId = data.documentId;

      // If initial text provided, append it!
      if (context.stepInput.initialText) {
        await this.appendTextToDoc(token, docId, context.stepInput.initialText);
      }

      return {
        success: true,
        data: {
          documentId: docId,
          title: data.title,
          documentUrl: `https://docs.google.com/document/d/${docId}`,
        },
      };
    }

    const documentId = this.extractDocId(context.stepInput.documentId);
    if (!documentId) throw new Error('Google Docs Error: "documentId" or Google Doc link is required.');

    // 2. Action: APPEND TEXT
    if (actionId === 'append_text') {
      const text = context.stepInput.text;
      if (!text) throw new Error('Google Docs Append error: "text" parameter is required.');

      await this.appendTextToDoc(token, documentId, text);

      return {
        success: true,
        data: {
          documentId,
          status: 'text_appended',
        },
      };
    }

    // 3. Action: READ DOCUMENT CONTENT
    if (actionId === 'get_document') {
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Docs Read Error (${res.status}): ${data.error?.message || res.statusText}`);

      let fullText = '';
      if (data.body?.content) {
        for (const item of data.body.content) {
          if (item.paragraph?.elements) {
            for (const elem of item.paragraph.elements) {
              if (elem.textRun?.content) {
                fullText += elem.textRun.content;
              }
            }
          }
        }
      }

      return {
        success: true,
        data: {
          documentId: data.documentId,
          title: data.title,
          content: fullText.trim(),
        },
      };
    }

    throw new Error(`Unsupported Google Docs action: ${actionId}`);
  }

  private async appendTextToDoc(token: string, docId: string, text: string): Promise<void> {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: text + '\n',
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`Google Docs Append Error (${res.status}): ${data.error?.message || res.statusText}`);
    }
  }

  private requireAccessToken(accessToken: string | undefined, userEmail: string): string {
    if (!accessToken || accessToken.startsWith('default_') || accessToken.startsWith('access_token_')) {
      throw new Error(
        `Google Docs API Error: Account "${userEmail}" is not authenticated with real Google OAuth. Please go to Connectors page and click "Connect Google Docs" to log in with your Google account.`
      );
    }
    return accessToken;
  }

  private extractDocId(input: string): string {
    if (!input) return '';
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  }
}
