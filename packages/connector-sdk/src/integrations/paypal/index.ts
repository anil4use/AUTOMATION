import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getPayPalChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const paypalManifest: ConnectorManifest = {
  id: 'paypal',
  name: 'PayPal',
  description: 'Full-power PayPal integration — Capture payments, create payouts, issue refunds, manage subscriptions & trigger on real-time payment webhooks.',
  category: 'Payments & E-Commerce',
  icon: '/icons/paypal.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'payment_completed',
      name: 'Payment Completed',
      description: 'Triggers when a PayPal checkout payment completes.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'id', label: 'Payment ID', type: 'string', required: true },
        { key: 'amount', label: 'Amount Value', type: 'string', required: true },
        { key: 'currency', label: 'Currency Code', type: 'string', required: true },
        { key: 'payer_email', label: 'Payer Email', type: 'string', required: true },
      ],
    },
    {
      id: 'subscription_cancelled',
      name: 'Subscription Cancelled',
      description: 'Triggers when a customer cancels their recurring billing subscription.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'id', label: 'Subscription ID', type: 'string', required: true },
        { key: 'payer_email', label: 'Payer Email', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_payout',
      name: 'Create Batch Payout',
      description: 'Sends funds directly to a PayPal recipient email account.',
      type: 'action',
      inputs: [
        { key: 'recipient_email', label: 'Recipient PayPal Email', type: 'string', required: true },
        { key: 'amount', label: 'Payout Amount (e.g. 50.00)', type: 'string', required: true },
        { key: 'currency', label: 'Currency Code (USD, EUR, GBP)', type: 'string', required: true },
        { key: 'note', label: 'Transfer Memo Note', type: 'string', required: false },
      ],
      outputs: [
        { key: 'payout_batch_id', label: 'Payout Batch ID', type: 'string', required: true },
        { key: 'batch_status', label: 'Batch Status', type: 'string', required: true },
      ],
    },
    {
      id: 'refund_payment',
      name: 'Issue Payment Refund',
      description: 'Refunds a completed payment transaction.',
      type: 'action',
      inputs: [
        { key: 'capture_id', label: 'Payment Capture ID', type: 'string', required: true },
        { key: 'amount', label: 'Refund Amount (Optional, full refund if omitted)', type: 'string', required: false },
        { key: 'currency', label: 'Currency Code', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Refund ID', type: 'string', required: true },
        { key: 'status', label: 'Refund Status', type: 'string', required: true },
      ],
    },
  ],
};

export class PayPalConnector extends BaseConnector {
  manifest = paypalManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const clientId = credentials.clientId || credentials.apiKey;
    const clientSecret = credentials.clientSecret || credentials.apiSecret;

    if (!clientId || !clientSecret) {
      return { success: false, data: {}, error: 'Missing PayPal Client ID or Client Secret.' };
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const tokenRes = await axios.post(
        'https://api-m.paypal.com/v1/oauth2/token',
        'grant_type=client_credentials',
        { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const accessToken = tokenRes.data.access_token;
      const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

      if (actionId === 'create_payout') {
        const url = 'https://api-m.paypal.com/v1/payments/payouts';
        const body = {
          sender_batch_header: { sender_batch_id: `payout_${Date.now()}`, email_subject: 'You have a payout!' },
          items: [
            {
              recipient_type: 'EMAIL',
              amount: { value: inputs.amount, currency: inputs.currency },
              receiver: inputs.recipient_email,
              note: inputs.note || 'AutoFlow Automated Payout',
            },
          ],
        };
        const res = await axios.post(url, body, { headers });
        const header = res.data?.batch_header || {};
        return { success: true, data: { payout_batch_id: header.payout_batch_id, batch_status: header.batch_status } };
      }

      if (actionId === 'refund_payment') {
        const url = `https://api-m.paypal.com/v2/payments/captures/${inputs.capture_id}/refund`;
        const body = inputs.amount ? { amount: { value: inputs.amount, currency_code: inputs.currency || 'USD' } } : {};
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { id: res.data.id, status: res.data.status } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getPayPalChoices(fieldId, credentials);
  }
}

manifestRegistry.register(paypalManifest);
