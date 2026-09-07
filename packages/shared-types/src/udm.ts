export interface NormalizedEmail {
  id: string;
  provider: 'gmail' | 'outlook' | 'sendgrid' | 'smtp' | string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments?: Array<{ filename: string; contentType: string; size: number; url?: string }>;
  receivedAt: string;
}

export interface NormalizedTicket {
  id: string;
  provider: 'jira' | 'zendesk' | 'freshdesk' | 'intercom' | string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  reporter?: { name: string; email: string };
  assignee?: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedContact {
  id: string;
  provider: 'hubspot' | 'salesforce' | 'pipedrive' | 'activecampaign' | string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  company?: string;
  tags?: string[];
  createdAt?: string;
}

export interface NormalizedOrder {
  id: string;
  provider: 'shopify' | 'woocommerce' | 'stripe' | string;
  orderNumber: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled' | 'refunded' | string;
  lineItems: Array<{ productId: string; title: string; quantity: number; unitPrice: number }>;
  createdAt: string;
}

export interface NormalizedFile {
  id: string;
  provider: 'google-drive' | 'dropbox' | 's3' | 'r2' | string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl?: string;
  parentFolderId?: string;
  updatedAt: string;
}
