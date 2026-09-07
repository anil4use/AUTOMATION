import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getWooCommerceChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const woocommerceManifest: ConnectorManifest = {
  id: 'woocommerce',
  name: 'WooCommerce',
  description: 'Full-power WooCommerce integration — Create & manage orders, products, customers, refunds & trigger on store sales webhooks.',
  category: 'Payments & E-Commerce',
  icon: '/icons/woocommerce.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'order_created',
      name: 'New Order Placed',
      description: 'Triggers when a new order is placed in your WooCommerce store.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'id', label: 'Order ID', type: 'number', required: true },
        { key: 'number', label: 'Order Number', type: 'string', required: true },
        { key: 'total', label: 'Total Price', type: 'string', required: true },
        { key: 'currency', label: 'Currency', type: 'string', required: true },
        { key: 'billing_email', label: 'Customer Email', type: 'string', required: true },
        { key: 'status', label: 'Order Status', type: 'string', required: true },
      ],
    },
    {
      id: 'order_paid',
      name: 'Order Paid',
      description: 'Triggers when an order status changes to processing or completed.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'id', label: 'Order ID', type: 'number', required: true },
        { key: 'total', label: 'Total Amount', type: 'string', required: true },
        { key: 'billing_email', label: 'Customer Email', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_order',
      name: 'Create Store Order',
      description: 'Creates a new customer order in WooCommerce.',
      type: 'action',
      inputs: [
        { key: 'billing_email', label: 'Customer Billing Email', type: 'string', required: true },
        { key: 'billing_first_name', label: 'First Name', type: 'string', required: true },
        { key: 'billing_last_name', label: 'Last Name', type: 'string', required: true },
        { key: 'line_items', label: 'Line Items Array (JSON)', type: 'string', required: true },
        { key: 'status', label: 'Initial Status (e.g. pending, processing)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Created Order ID', type: 'number', required: true },
        { key: 'order_key', label: 'Order Secret Key', type: 'string', required: true },
      ],
    },
    {
      id: 'create_product',
      name: 'Create Catalog Product',
      description: 'Creates a new product listing.',
      type: 'action',
      inputs: [
        { key: 'name', label: 'Product Name', type: 'string', required: true },
        { key: 'regular_price', label: 'Regular Price', type: 'string', required: true },
        { key: 'description', label: 'Product Description (HTML/Text)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Product ID', type: 'number', required: true },
        { key: 'permalink', label: 'Product URL Link', type: 'string', required: true },
      ],
    },
  ],
};

export class WooCommerceConnector extends BaseConnector {
  manifest = woocommerceManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const storeUrl = credentials.storeUrl;
    const consumerKey = credentials.consumerKey || credentials.apiKey;
    const consumerSecret = credentials.consumerSecret || credentials.apiSecret;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return { success: false, data: {}, error: 'Missing WooCommerce store credentials (URL, key, secret).' };
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
    const baseUrl = storeUrl.replace(/\/$/, '');

    try {
      if (actionId === 'create_order') {
        const url = `${baseUrl}/wp-json/wc/v3/orders`;
        const line_items = typeof inputs.line_items === 'string' ? JSON.parse(inputs.line_items) : inputs.line_items;
        const body = {
          billing: { email: inputs.billing_email, first_name: inputs.billing_first_name, last_name: inputs.billing_last_name },
          line_items,
          status: inputs.status || 'processing',
        };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { id: res.data.id, order_key: res.data.order_key } };
      }

      if (actionId === 'create_product') {
        const url = `${baseUrl}/wp-json/wc/v3/products`;
        const body = { name: inputs.name, regular_price: inputs.regular_price, description: inputs.description || '' };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { id: res.data.id, permalink: res.data.permalink } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getWooCommerceChoices(fieldId, credentials);
  }
}

manifestRegistry.register(woocommerceManifest);
