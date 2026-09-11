import mongoose from 'mongoose';
import { ConnectorSynonymGroupsModel } from '../models/connector-synonym-groups.model';

/**
 * Universal Field Synonym Groups
 *
 * Groups of keys across connectors that carry the exact same semantic intent.
 * Used by SemanticFieldMatcher when direct key names don't match.
 * Safe to re-run anytime (upserts based on canonicalRole).
 */
export const UNIVERSAL_SYNONYM_GROUPS = [
  {
    canonicalRole: 'email_address',
    name: 'Email Address',
    synonyms: ['email', 'email_address', 'to_email', 'from_email', 'recipient_email', 'sender_email', 'user_email', 'customer_email', 'mail', 'e_mail', 'to', 'from'],
    description: 'Email addresses across email services, CRMs, support tools',
    enabled: true
  },
  {
    canonicalRole: 'phone_number',
    name: 'Phone Number',
    synonyms: ['phone', 'phone_number', 'mobile', 'tel', 'telephone', 'whatsapp_number', 'sms_number', 'contact_phone', 'mobile_phone'],
    description: 'Phone numbers across messaging and CRM tools',
    enabled: true
  },
  {
    canonicalRole: 'message_content',
    name: 'Message Body & Content',
    synonyms: ['text', 'body', 'content', 'message', 'msg', 'message_text', 'body_text', 'html_body', 'note_content', 'comment_text', 'summary', 'description', 'prompt', 'result'],
    description: 'Text content, message body, comments, descriptions',
    enabled: true
  },
  {
    canonicalRole: 'title_subject',
    name: 'Title & Subject',
    synonyms: ['subject', 'title', 'name', 'headline', 'summary', 'deal_name', 'task_title', 'issue_title', 'topic', 'header'],
    description: 'Titles, subject lines, ticket summaries',
    enabled: true
  },
  {
    canonicalRole: 'first_name',
    name: 'First Name',
    synonyms: ['first_name', 'fname', 'given_name', 'first', 'forename'],
    description: 'User or contact first name',
    enabled: true
  },
  {
    canonicalRole: 'last_name',
    name: 'Last Name',
    synonyms: ['last_name', 'lname', 'family_name', 'surname', 'last'],
    description: 'User or contact last name',
    enabled: true
  },
  {
    canonicalRole: 'full_name',
    name: 'Full Name',
    synonyms: ['full_name', 'name', 'display_name', 'contact_name', 'customer_name', 'user_name'],
    description: 'Full human name',
    enabled: true
  },
  {
    canonicalRole: 'amount_money',
    name: 'Money Amount',
    synonyms: ['amount', 'price', 'total', 'cost', 'fee', 'charge', 'value', 'subtotal', 'grand_total', 'payment_amount'],
    description: 'Monetary amounts across payment gateways, e-commerce, and invoicing',
    enabled: true
  },
  {
    canonicalRole: 'currency_code',
    name: 'Currency Code',
    synonyms: ['currency', 'currency_code', 'iso_currency', 'curr'],
    description: 'ISO 4217 currency code (USD, EUR, INR)',
    enabled: true
  },
  {
    canonicalRole: 'timestamp',
    name: 'Date / Timestamp',
    synonyms: ['timestamp', 'date', 'created_at', 'updated_at', 'sent_at', 'received_at', 'time', 'date_created', 'created'],
    description: 'Date and time representations',
    enabled: true
  },
  {
    canonicalRole: 'url_link',
    name: 'URL / Web Link',
    synonyms: ['url', 'link', 'href', 'website', 'domain', 'web_url', 'target_url'],
    description: 'Web URLs and links',
    enabled: true
  },
  {
    canonicalRole: 'status',
    name: 'Status / Stage',
    synonyms: ['status', 'state', 'stage', 'phase', 'type'],
    description: 'Status codes, lifecycle stages, state enums',
    enabled: true
  },
  {
    canonicalRole: 'company_name',
    name: 'Company / Organization',
    synonyms: ['company', 'company_name', 'organization', 'org_name', 'business_name', 'account_name'],
    description: 'Company or organization names',
    enabled: true
  },
  {
    canonicalRole: 'unique_id',
    name: 'System Identifier',
    synonyms: ['id', '_id', 'uid', 'uuid', 'guid', 'item_id', 'object_id'],
    description: 'Unique database or system IDs',
    enabled: true
  },
  {
    canonicalRole: 'file_url',
    name: 'File / Attachment Link',
    synonyms: ['file_url', 'attachment_url', 'media_url', 'document_url', 'image_url'],
    description: 'Links to files, documents, or media attachments',
    enabled: true
  }
];

export async function seedSynonymGroups(options: { dryRun?: boolean } = {}) {
  if (options.dryRun) {
    console.log('DRY RUN: Would seed the following synonym groups:');
    console.table(UNIVERSAL_SYNONYM_GROUPS.map(g => ({ role: g.canonicalRole, synonyms: g.synonyms.join(', ') })));
    return;
  }

  let count = 0;
  for (const group of UNIVERSAL_SYNONYM_GROUPS) {
    const docData = {
      groupName: group.canonicalRole,
      canonicalRole: group.canonicalRole,
      semanticRole: group.canonicalRole,
      name: group.name,
      synonyms: group.synonyms,
      description: group.description,
      enabled: group.enabled,
      updatedAt: new Date(),
    };
    await ConnectorSynonymGroupsModel.findOneAndUpdate(
      { groupName: group.canonicalRole },
      { $set: docData },
      { upsert: true, new: true, strict: false }
    );
    count++;
  }
  console.log(`✅ Seeded ${count} synonym groups to connector_synonym_groups`);
}

// Run directly if called as a script
if (require.main === module) {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/automation_platform';
  mongoose.connect(MONGO_URI).then(async () => {
    await seedSynonymGroups({ dryRun: process.argv.includes('--dry-run') });
    await mongoose.disconnect();
  }).catch(err => {
    console.error('Failed to seed synonym groups:', err);
    process.exit(1);
  });
}
