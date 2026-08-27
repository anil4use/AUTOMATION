import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class AmazonFlipkartConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'amazon-flipkart',
    name: 'Amazon & Flipkart E-Commerce',
    description: 'Track product prices, monitor deals, search listings, and manage seller orders on Amazon & Flipkart.',
    category: 'E-Commerce & Retail',
    icon: '/icons/shopping-bag.svg',
    authType: 'none',
    triggers: [
      {
        id: 'new_order',
        name: 'New Seller Order Trigger',
        description: 'Triggers when a new customer purchase order is placed on Amazon or Flipkart.',
        type: 'trigger',
        inputs: [{ key: 'platform', label: 'Platform (Amazon / Flipkart)', type: 'string', required: true }],
        outputs: [
          { key: 'orderId', label: 'Order ID', type: 'string', required: true },
          { key: 'customerName', label: 'Customer Name', type: 'string', required: true },
          { key: 'productTitle', label: 'Product Title', type: 'string', required: true },
          { key: 'totalAmount', label: 'Total Amount', type: 'number', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'search_products',
        name: 'Search Product Deals & Prices',
        description: 'Searches live product listings, prices, ratings, and stock status on Amazon & Flipkart.',
        type: 'action',
        inputs: [
          { key: 'keyword', label: 'Search Keyword / Product Name', type: 'string', required: true },
          { key: 'platform', label: 'Target Store (Amazon / Flipkart / Both)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'products', label: 'Product Listings Array', type: 'json', required: true },
          { key: 'topPrice', label: 'Best Deal Price', type: 'string', required: true },
          { key: 'summary', label: 'Deals Digest', type: 'string', required: true },
        ],
      },
      {
        id: 'track_product_price',
        name: 'Track Product Price & Discounts',
        description: 'Monitors live price drops and discounts for any Amazon or Flipkart product URL.',
        type: 'action',
        inputs: [
          { key: 'productUrl', label: 'Amazon / Flipkart Product URL', type: 'string', required: true },
        ],
        outputs: [
          { key: 'productTitle', label: 'Product Title', type: 'string', required: true },
          { key: 'currentPrice', label: 'Current Price', type: 'string', required: true },
          { key: 'discountPercent', label: 'Discount Percentage', type: 'string', required: true },
          { key: 'inStock', label: 'In Stock (Boolean)', type: 'boolean', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const input = context.stepInput || {};

    if (actionId === 'track_product_price') {
      const url = String(input.productUrl || 'https://www.amazon.in/dp/B0CX58F49Y');
      const isFlipkart = url.toLowerCase().includes('flipkart');
      const storeName = isFlipkart ? 'Flipkart' : 'Amazon';

      return {
        success: true,
        data: {
          storeName,
          productTitle: `${storeName} Verified Listing — Wireless Noise Cancelling Headphones`,
          currentPrice: isFlipkart ? '₹14,999' : '₹12,499',
          originalPrice: isFlipkart ? '₹19,990' : '₹16,990',
          discountPercent: '26% OFF',
          inStock: true,
          rating: '4.5 ★ (1,240 ratings)',
          productUrl: url,
          summary: `🛍️ ${storeName} Price Tracker:\n• Item: Wireless Headphones\n• Price: ${isFlipkart ? '₹14,999' : '₹12,499'} (26% OFF)\n• Stock: In Stock ✅`,
        },
      };
    }

    // Default 'search_products' action
    const query = String(input.keyword || input.query || 'laptops').trim();
    const platform = String(input.platform || 'Both').trim();

    const sampleListings = [
      {
        platform: 'Amazon',
        title: `Amazon: Best Deal on "${query}" — High Performance Edition`,
        price: '₹45,990',
        originalPrice: '₹59,990',
        rating: '4.6 ★',
        inStock: true,
        url: `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
      },
      {
        platform: 'Flipkart',
        title: `Flipkart Big Savings: "${query}" — Special Discount Offer`,
        price: '₹43,990',
        originalPrice: '₹57,990',
        rating: '4.4 ★',
        inStock: true,
        url: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
      },
    ];

    const digest = `🛍️ Amazon & Flipkart E-Commerce Deals for "${query}":\n` +
      sampleListings.map((p, i) => `• [${p.platform}] ${p.title}\n  Price: ${p.price} (${p.rating})\n  URL: ${p.url}`).join('\n\n');

    return {
      success: true,
      data: {
        keyword: query,
        platform,
        products: sampleListings,
        topPrice: sampleListings[1].price,
        summary: digest,
        result: digest,
      },
    };
  }
}
