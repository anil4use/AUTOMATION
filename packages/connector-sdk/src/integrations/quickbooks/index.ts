import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getQuickBooksChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const quickbooksManifest: ConnectorManifest = {
  id: 'quickbooks',
  name: 'QuickBooks Online',
  description: 'Full-power QuickBooks Online integration — Create invoices, manage customers, record payments, create bills & trigger automations on paid invoices.',
  category: 'Finance & Accounting',
  icon: '/icons/quickbooks.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'invoice_paid',
      name: 'Invoice Paid',
      description: 'Triggers when a customer invoice status changes to paid.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'invoiceId', label: 'Invoice ID', type: 'string', required: true },
        { key: 'customerName', label: 'Customer Name', type: 'string', required: true },
        { key: 'totalAmt', label: 'Paid Amount', type: 'number', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_invoice',
      name: 'Create Invoice',
      description: 'Creates a new customer sales invoice.',
      type: 'action',
      inputs: [
        { key: 'realmId', label: 'Company Realm ID', type: 'string', required: true },
        { key: 'customerId', label: 'Customer ID', type: 'string', required: true },
        { key: 'amount', label: 'Line Item Amount', type: 'string', required: true },
        { key: 'description', label: 'Invoice Item Description', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Invoice ID', type: 'string', required: true },
        { key: 'docNumber', label: 'Doc Number', type: 'string', required: true },
        { key: 'totalAmt', label: 'Total Amount', type: 'number', required: true },
      ],
    },
    {
      id: 'create_customer',
      name: 'Create Customer',
      description: 'Creates a new customer record.',
      type: 'action',
      inputs: [
        { key: 'realmId', label: 'Company Realm ID', type: 'string', required: true },
        { key: 'displayName', label: 'Customer Display Name', type: 'string', required: true },
        { key: 'email', label: 'Email Address', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Customer ID', type: 'string', required: true },
        { key: 'displayName', label: 'Display Name', type: 'string', required: true },
      ],
    },
  ],
};

export class QuickBooksConnector extends BaseConnector {
  manifest = quickbooksManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Missing QuickBooks access token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' };

    try {
      if (actionId === 'create_invoice') {
        const url = `https://quickbooks.api.intuit.com/v3/company/${inputs.realmId}/invoice`;
        const body = {
          CustomerRef: { value: inputs.customerId },
          Line: [
            {
              DetailType: 'SalesItemLineDetail',
              Amount: Number(inputs.amount),
              SalesItemLineDetail: { ItemRef: { name: 'Services', value: '1' } },
              Description: inputs.description || 'AutoFlow Invoice',
            },
          ],
        };
        const res = await axios.post(url, body, { headers });
        const inv = res.data?.Invoice || {};
        return { success: true, data: { id: inv.Id, docNumber: inv.DocNumber, totalAmt: inv.TotalAmt } };
      }

      if (actionId === 'create_customer') {
        const url = `https://quickbooks.api.intuit.com/v3/company/${inputs.realmId}/customer`;
        const body = { DisplayName: inputs.displayName, PrimaryEmailAddr: inputs.email ? { Address: inputs.email } : undefined };
        const res = await axios.post(url, body, { headers });
        const cust = res.data?.Customer || {};
        return { success: true, data: { id: cust.Id, displayName: cust.DisplayName } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.Fault?.Error?.[0]?.Message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getQuickBooksChoices(fieldId, credentials);
  }
}

manifestRegistry.register(quickbooksManifest);
