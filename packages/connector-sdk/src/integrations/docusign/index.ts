import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getDocuSignChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const docusignManifest: ConnectorManifest = {
  id: 'docusign',
  name: 'DocuSign eSignature',
  description: 'Full-power DocuSign integration — Send signature envelopes, check document status, download completed PDFs & trigger automations when contracts are signed.',
  category: 'Legal & Business',
  icon: '/icons/docusign.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'envelope_completed',
      name: 'Document Signed & Completed',
      description: 'Triggers when all signers complete an envelope.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'envelopeId', label: 'Envelope ID', type: 'string', required: true },
        { key: 'status', label: 'Envelope Status', type: 'string', required: true },
        { key: 'subject', label: 'Email Subject', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'send_envelope',
      name: 'Send Document Envelope',
      description: 'Dispatches a document to recipients for electronic signature.',
      type: 'action',
      inputs: [
        { key: 'accountId', label: 'DocuSign Account ID', type: 'string', required: true },
        { key: 'emailSubject', label: 'Email Subject Line', type: 'string', required: true },
        { key: 'signerEmail', label: 'Signer Email', type: 'string', required: true },
        { key: 'signerName', label: 'Signer Full Name', type: 'string', required: true },
        { key: 'documentBase64', label: 'Document File Base64 Content', type: 'string', required: true },
        { key: 'documentName', label: 'Document File Name (e.g. Contract.pdf)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'envelopeId', label: 'Envelope ID', type: 'string', required: true },
        { key: 'status', label: 'Envelope Status (sent)', type: 'string', required: true },
      ],
    },
  ],
};

export class DocuSignConnector extends BaseConnector {
  manifest = docusignManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Missing DocuSign access token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'send_envelope') {
        const url = `https://demo.docusign.net/restapi/v2.1/accounts/${inputs.accountId}/envelopes`;
        const body = {
          emailSubject: inputs.emailSubject,
          documents: [{ documentId: '1', name: inputs.documentName, fileExtension: 'pdf', documentBase64: inputs.documentBase64 }],
          recipients: {
            signers: [{ email: inputs.signerEmail, name: inputs.signerName, recipientId: '1', routingOrder: '1' }],
          },
          status: 'sent',
        };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { envelopeId: res.data.envelopeId, status: res.data.status } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getDocuSignChoices(fieldId, credentials);
  }
}

manifestRegistry.register(docusignManifest);
