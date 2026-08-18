import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class StripeConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'stripe',
    name: 'Stripe Payments',
    description: 'Listen for payment webhooks, manage customers and subscriptions.',
    category: 'Finance',
    icon: '/icons/stripe.svg',
    authType: 'api_key',
    triggers: [
      {
        id: 'payment_succeeded',
        name: 'Payment Succeeded',
        description: 'Triggers when a successful customer checkout payment is received.',
        type: 'trigger',
        inputs: [{ key: 'eventType', label: 'Event Type', type: 'string', required: true }],
        outputs: [
          { key: 'paymentId', label: 'Payment ID', type: 'string', required: true },
          { key: 'amount', label: 'Amount (cents)', type: 'number', required: true },
          { key: 'customerEmail', label: 'Customer Email', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'create_customer',
        name: 'Create Stripe Customer',
        description: 'Creates a new Stripe customer account.',
        type: 'action',
        inputs: [{ key: 'email', label: 'Customer Email', type: 'string', required: true }],
        outputs: [{ key: 'customerId', label: 'Customer ID', type: 'string', required: true }],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    return {
      success: true,
      data: {
        customerId: `cus_${Date.now()}`,
        email: context.stepInput.email || 'customer@example.com',
      },
    };
  }
}
