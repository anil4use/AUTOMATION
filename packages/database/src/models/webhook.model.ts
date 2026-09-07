import { Schema, model, Document } from 'mongoose';

export interface IWebhook extends Document {
  organizationId: Schema.Types.ObjectId;
  workflowId: Schema.Types.ObjectId;
  webhookId: string; // unique UUID or custom path
  secret: string; // HMAC secret
  providerType: string; // e.g. 'github', 'slack', 'jira', 'whatsapp', 'google-drive'
  expiresAt?: Date; // Optional 30-day Jira or 7-day Drive expiry
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    webhookId: { type: String, required: true, unique: true, index: true },
    secret: { type: String, required: true },
    providerType: { type: String, required: true },
    expiresAt: { type: Date },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export const WebhookModel = model<IWebhook>('Webhook', WebhookSchema);
