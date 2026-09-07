import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import axios from 'axios';

const stripeManifest: ConnectorManifest = {
  id: 'stripe',
  name: 'Stripe',
  description: 'Full-power Stripe payments & billing integration — Create customers, invoices, payment intents, subscriptions, list transactions & trigger automations on real-time payment webhooks.',
  category: 'Finance',
  icon: '/icons/stripe.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'charge_succeeded',
      name: 'Charge Succeeded',
      description: 'Triggers when a charge succeeds.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'chargeId', label: 'Charge ID', type: 'string', required: true },
        { key: 'amount', label: 'Amount in Cents', type: 'number', required: true },
        { key: 'currency', label: 'Currency', type: 'string', required: true },
        { key: 'customer', label: 'Customer ID', type: 'string', required: false },
      ],
    },
    {
      id: 'payment_intent_succeeded',
      name: 'Payment Intent Succeeded',
      description: 'Triggers when a payment intent is successfully completed.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'paymentIntentId', label: 'Payment Intent ID', type: 'string', required: true },
        { key: 'amount', label: 'Amount in Cents', type: 'number', required: true },
        { key: 'customer', label: 'Customer ID', type: 'string', required: false },
      ],
    },
    {
      id: 'customer_created',
      name: 'Customer Created',
      description: 'Triggers when a new customer is created in Stripe.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'customerId', label: 'Customer ID', type: 'string', required: true },
        { key: 'email', label: 'Customer Email', type: 'string', required: false },
        { key: 'name', label: 'Customer Name', type: 'string', required: false },
      ],
    },
    {
      id: 'invoice_paid',
      name: 'Invoice Paid',
      description: 'Triggers when an invoice is paid.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'invoiceId', label: 'Invoice ID', type: 'string', required: true },
        { key: 'amountPaid', label: 'Amount Paid in Cents', type: 'number', required: true },
        { key: 'customer', label: 'Customer ID', type: 'string', required: true },
      ],
    },
    {
      id: 'subscription_created',
      name: 'Subscription Created',
      description: 'Triggers when a new customer subscription is started.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'subscriptionId', label: 'Subscription ID', type: 'string', required: true },
        { key: 'customer', label: 'Customer ID', type: 'string', required: true },
        { key: 'status', label: 'Status', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_customer',
      name: 'Create Customer',
      description: 'Creates a new Stripe customer.',
      type: 'action',
      inputs: [
        { key: 'email', label: 'Customer Email', type: 'string', required: true },
        { key: 'name', label: 'Customer Name', type: 'string', required: false },
        { key: 'description', label: 'Description', type: 'string', required: false },
      ],
      outputs: [
        { key: 'customerId', label: 'Customer ID', type: 'string', required: true },
      ],
    },
    {
      id: 'get_customer',
      name: 'Get Customer Details',
      description: 'Fetches details for a specific Stripe customer.',
      type: 'action',
      inputs: [
        { key: 'customerId', label: 'Customer ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Customer ID', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string', required: false },
        { key: 'name', label: 'Name', type: 'string', required: false },
        { key: 'balance', label: 'Balance', type: 'number', required: true },
      ],
    },
    {
      id: 'create_payment_intent',
      name: 'Create Payment Intent',
      description: 'Creates a Stripe PaymentIntent for charging a customer.',
      type: 'action',
      inputs: [
        { key: 'amount', label: 'Amount in Cents (e.g. 2000 = $20.00)', type: 'number', required: true },
        { key: 'currency', label: 'Currency Code (e.g. usd)', type: 'string', required: true },
        { key: 'customerId', label: 'Customer ID (Optional)', type: 'string', required: false },
        { key: 'description', label: 'Description', type: 'string', required: false },
      ],
      outputs: [
        { key: 'paymentIntentId', label: 'Payment Intent ID', type: 'string', required: true },
        { key: 'clientSecret', label: 'Client Secret', type: 'string', required: true },
        { key: 'status', label: 'Status', type: 'string', required: true },
      ],
    },
    {
      id: 'create_invoice',
      name: 'Create Draft Invoice',
      description: 'Creates a draft invoice for a customer.',
      type: 'action',
      inputs: [
        { key: 'customerId', label: 'Customer ID', type: 'string', required: true },
        { key: 'autoAdvance', label: 'Auto Finalize and Charge?', type: 'boolean', required: false },
      ],
      outputs: [
        { key: 'invoiceId', label: 'Invoice ID', type: 'string', required: true },
        { key: 'status', label: 'Invoice Status', type: 'string', required: true },
      ],
    },
    {
      id: 'send_invoice',
      name: 'Send Invoice for Payment',
      description: 'Finalizes and emails an invoice to customer.',
      type: 'action',
      inputs: [
        { key: 'invoiceId', label: 'Invoice ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'invoiceId', label: 'Invoice ID', type: 'string', required: true },
        { key: 'hostedInvoiceUrl', label: 'Payment URL', type: 'string', required: true },
      ],
    },
    {
      id: 'list_customers',
      name: 'List Customers',
      description: 'Lists Stripe customers.',
      type: 'action',
      inputs: [
        { key: 'limit', label: 'Max Results (Default: 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'count', label: 'Count', type: 'number', required: true },
        { key: 'customers', label: 'Customers Array', type: 'array', required: true },
      ],
    },
    {
      id: 'list_invoices',
      name: 'List Invoices',
      description: 'Lists recent invoices.',
      type: 'action',
      inputs: [
        { key: 'customerId', label: 'Customer ID (Optional filter)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'count', label: 'Count', type: 'number', required: true },
        { key: 'invoices', label: 'Invoices Array', type: 'array', required: true },
      ],
    },
  ],
};

export class StripeConnector extends BaseConnector {
  manifest = stripeManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const apiKey = credentials?.apiKey || credentials?.secretKey;

    if (!apiKey) {
      return { success: false, data: {}, error: 'Stripe Secret API Key is required.' };
    }

    const client = axios.create({
      baseURL: 'https://api.stripe.com/v1',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    try {
      switch (actionId) {
        case 'create_customer': {
          const params = new URLSearchParams();
          params.append('email', inputs.email);
          if (inputs.name) params.append('name', inputs.name);
          if (inputs.description) params.append('description', inputs.description);

          const { data } = await client.post('/customers', params);
          return { success: true, data: { customerId: data.id } };
        }

        case 'get_customer': {
          const { data } = await client.get(`/customers/${inputs.customerId}`);
          return { success: true, data: { id: data.id, email: data.email, name: data.name, balance: data.balance } };
        }

        case 'create_payment_intent': {
          const params = new URLSearchParams();
          params.append('amount', String(inputs.amount));
          params.append('currency', inputs.currency || 'usd');
          if (inputs.customerId) params.append('customer', inputs.customerId);
          if (inputs.description) params.append('description', inputs.description);

          const { data } = await client.post('/payment_intents', params);
          return {
            success: true,
            data: {
              paymentIntentId: data.id,
              clientSecret: data.client_secret,
              status: data.status,
            },
          };
        }

        case 'create_invoice': {
          const params = new URLSearchParams();
          params.append('customer', inputs.customerId);
          if (inputs.autoAdvance !== undefined) params.append('auto_advance', String(Boolean(inputs.autoAdvance)));

          const { data } = await client.post('/invoices', params);
          return { success: true, data: { invoiceId: data.id, status: data.status } };
        }

        case 'send_invoice': {
          const { data: finalize } = await client.post(`/invoices/${inputs.invoiceId}/finalize`);
          const { data: sent } = await client.post(`/invoices/${inputs.invoiceId}/send`);
          return {
            success: true,
            data: {
              invoiceId: sent.id,
              hostedInvoiceUrl: sent.hosted_invoice_url || finalize.hosted_invoice_url,
            },
          };
        }

        case 'list_customers': {
          const { data } = await client.get('/customers', { params: { limit: inputs.limit || 10 } });
          return { success: true, data: { count: data.data?.length || 0, customers: data.data || [] } };
        }

        case 'list_invoices': {
          const params: any = {};
          if (inputs.customerId) params.customer = inputs.customerId;
          const { data } = await client.get('/invoices', { params });
          return { success: true, data: { count: data.data?.length || 0, invoices: data.data || [] } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Stripe action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Stripe API error';
      return { success: false, data: {}, error: `Stripe error: ${msg}` };
    }
  }
}

export const stripeConnector = new StripeConnector();
manifestRegistry.register(stripeManifest);
