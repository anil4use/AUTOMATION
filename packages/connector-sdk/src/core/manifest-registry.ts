import { ConnectorManifest, AIConnectorIndex } from '@automation/shared-types';

const _STATIC_MANIFESTS: ConnectorManifest[] = [
  // Google Suite
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read emails, search inbox, send notifications, reply to threads & create drafts.',
    category: 'Google Suite',
    icon: '/icons/gmail.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_email',
        name: 'New Email Received',
        description: 'Triggers when a new email arrives in the inbox or matching a label.',
        type: 'trigger',
        inputs: [
          { key: 'label', label: 'Mailbox Label (e.g. INBOX, STARRED)', type: 'string', required: false },
          { key: 'searchQuery', label: 'Search Filter Query (e.g. is:unread)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'messageId', label: 'Message ID', type: 'string', required: true },
          { key: 'threadId', label: 'Thread ID', type: 'string', required: true },
          { key: 'subject', label: 'Subject', type: 'string', required: true },
          { key: 'from', label: 'Sender Email (From)', type: 'string', required: true },
          { key: 'to', label: 'Recipient Email (To)', type: 'string', required: true },
          { key: 'bodyPlain', label: 'Body Text Content', type: 'string', required: true },
          { key: 'bodyHtml', label: 'Body HTML Content', type: 'string', required: false },
          { key: 'date', label: 'Received Date/Time', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'send_email',
        name: 'Send Email Message',
        description: 'Sends an email notification via your Google account.',
        type: 'action',
        inputs: [
          { key: 'to', label: 'Recipient Email (To)', type: 'string', required: true },
          { key: 'cc', label: 'CC Email Addresses', type: 'string', required: false },
          { key: 'bcc', label: 'BCC Email Addresses', type: 'string', required: false },
          { key: 'subject', label: 'Email Subject', type: 'string', required: true },
          { key: 'body', label: 'Email Message Body', type: 'string', required: true },
          { key: 'isHtml', label: 'Is HTML Format (true/false)', type: 'boolean', required: false },
        ],
        outputs: [
          { key: 'messageId', label: 'Message ID', type: 'string', required: true },
          { key: 'threadId', label: 'Thread ID', type: 'string', required: true },
          { key: 'status', label: 'Status', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Append rows, create spreadsheets, auto-create worksheet tabs & read cell ranges.',
    category: 'Google Suite',
    icon: '/icons/sheets.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_row',
        name: 'New Spreadsheet Row Added',
        description: 'Triggers when a new row is appended to a Google Sheet.',
        type: 'trigger',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
          { key: 'worksheetName', label: 'Worksheet Tab Name', type: 'string', required: true },
        ],
        outputs: [
          { key: 'rowId', label: 'Row Index Number', type: 'number', required: true },
          { key: 'columnValues', label: 'Column Values Array', type: 'json', required: true },
          { key: 'appendedAt', label: 'Appended Timestamp', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'append_row',
        name: 'Append Row to Worksheet',
        description: 'Appends a new data row to the bottom of a worksheet.',
        type: 'action',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'string', required: true },
          { key: 'worksheetName', label: 'Worksheet Tab Name (Default: Sheet1)', type: 'string', required: true },
          { key: 'values', label: 'Row Values (Comma separated or JSON array)', type: 'string', required: true },
          { key: 'valueInputOption', label: 'Value Formatting (USER_ENTERED or RAW)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'updatedRange', label: 'Updated Cell Range (e.g. Sheet1!A10:D10)', type: 'string', required: true },
          { key: 'updatedRows', label: 'Updated Row Count', type: 'number', required: true },
          { key: 'updatedColumns', label: 'Updated Column Count', type: 'number', required: true },
        ],
      },
    ],
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Upload files, create folders, share links & search Drive storage.',
    category: 'Google Suite',
    icon: '/icons/drive.svg',
    authType: 'oauth2',
    triggers: [],
    actions: [
      {
        id: 'upload_file',
        name: 'Upload File to Folder',
        description: 'Uploads a file to Google Drive.',
        type: 'action',
        inputs: [
          { key: 'folderId', label: 'Target Folder ID', type: 'string', required: false },
          { key: 'fileName', label: 'File Name with extension', type: 'string', required: true },
          { key: 'fileContent', label: 'File Content or URL', type: 'string', required: true },
          { key: 'mimeType', label: 'MIME Content Type', type: 'string', required: false },
        ],
        outputs: [
          { key: 'fileId', label: 'Drive File ID', type: 'string', required: true },
          { key: 'fileUrl', label: 'Shareable File Web View URL', type: 'string', required: true },
          { key: 'size', label: 'File Size in Bytes', type: 'number', required: true },
        ],
      },
    ],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Schedule meetings, create events, set reminders & list calendars.',
    category: 'Google Suite',
    icon: '/icons/calendar.svg',
    authType: 'oauth2',
    triggers: [],
    actions: [
      {
        id: 'create_event',
        name: 'Create Calendar Event',
        description: 'Schedules a new meeting or event on your Google Calendar.',
        type: 'action',
        inputs: [
          { key: 'calendarId', label: 'Calendar ID (Default: primary)', type: 'string', required: false },
          { key: 'summary', label: 'Event Title / Summary', type: 'string', required: true },
          { key: 'description', label: 'Event Description & Meeting Link', type: 'string', required: false },
          { key: 'startTime', label: 'Start Date/Time (ISO string)', type: 'string', required: true },
          { key: 'endTime', label: 'End Date/Time (ISO string)', type: 'string', required: true },
          { key: 'attendees', label: 'Attendee Emails (Comma separated)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'eventId', label: 'Event ID', type: 'string', required: true },
          { key: 'eventLink', label: 'Google Calendar Event Link', type: 'string', required: true },
          { key: 'status', label: 'Event Status', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    description: 'Create documents, read content, format text & append paragraphs.',
    category: 'Google Suite',
    icon: '/icons/docs.svg',
    authType: 'oauth2',
    triggers: [],
    actions: [
      {
        id: 'create_doc',
        name: 'Create Google Document',
        description: 'Creates a new Google Doc file.',
        type: 'action',
        inputs: [
          { key: 'title', label: 'Document Title', type: 'string', required: true },
          { key: 'content', label: 'Initial Document Text / Paragraph', type: 'string', required: false },
          { key: 'folderId', label: 'Google Drive Folder ID', type: 'string', required: false },
        ],
        outputs: [
          { key: 'documentId', label: 'Document ID', type: 'string', required: true },
          { key: 'title', label: 'Document Title', type: 'string', required: true },
          { key: 'documentUrl', label: 'Document Edit URL', type: 'string', required: true },
        ],
      },
    ],
  },

  // Communication & Messaging
  {
    id: 'slack',
    name: 'Slack',
    description: 'Post messages, upload snippets, trigger slash commands & listen for events.',
    category: 'Communication',
    icon: '/icons/slack.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_message',
        name: 'New Message Posted in Channel',
        description: 'Triggers when a message is posted to a Slack channel.',
        type: 'trigger',
        inputs: [
          { key: 'channel', label: 'Slack Channel ID or Name', type: 'string', required: true },
        ],
        outputs: [
          { key: 'ts', label: 'Message Timestamp ID', type: 'string', required: true },
          { key: 'user', label: 'User ID', type: 'string', required: true },
          { key: 'text', label: 'Message Text Content', type: 'string', required: true },
          { key: 'channel', label: 'Channel ID', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'send_message',
        name: 'Post Channel Message',
        description: 'Posts a message to a Slack channel.',
        type: 'action',
        inputs: [
          { key: 'channel', label: 'Channel Name or ID (e.g. #general)', type: 'string', required: true },
          { key: 'text', label: 'Message Text Content', type: 'string', required: true },
          { key: 'thread_ts', label: 'Thread Timestamp (To reply in thread)', type: 'string', required: false },
          { key: 'username', label: 'Bot Username Override', type: 'string', required: false },
          { key: 'icon_emoji', label: 'Bot Icon Emoji (e.g. :robot_face:)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'ts', label: 'Message Timestamp ID', type: 'string', required: true },
          { key: 'channel', label: 'Channel ID', type: 'string', required: true },
          { key: 'ok', label: 'Success Status (true/false)', type: 'boolean', required: true },
        ],
      },
    ],
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    description: 'Send channel embeds, dispatch webhooks & trigger Discord bot notifications.',
    category: 'Communication',
    icon: '/icons/discord.svg',
    authType: 'api_key',
    triggers: [],
    actions: [
      {
        id: 'post_embed',
        name: 'Post Discord Embed Card',
        description: 'Posts a rich formatted embed card to a Discord webhook channel.',
        type: 'action',
        inputs: [
          { key: 'webhookUrl', label: 'Discord Webhook URL', type: 'string', required: true },
          { key: 'username', label: 'Bot Display Name', type: 'string', required: false },
          { key: 'content', label: 'Message Text Content', type: 'string', required: true },
          { key: 'embedTitle', label: 'Embed Title', type: 'string', required: false },
          { key: 'embedColor', label: 'Embed Hex Color Code', type: 'string', required: false },
        ],
        outputs: [
          { key: 'messageId', label: 'Discord Message ID', type: 'string', required: true },
          { key: 'status', label: 'HTTP Status Code', type: 'number', required: true },
        ],
      },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    description: 'Listen to inbound chat messages and send responses, alerts, and formatting via Telegram bots.',
    category: 'Communication',
    icon: '/icons/telegram.svg',
    authType: 'api_key',
    triggers: [
      {
        id: 'new_message',
        name: 'New Message Received',
        description: 'Triggers when any contact or group sends a message to your Telegram Bot.',
        type: 'trigger',
        inputs: [
          { key: 'botToken', label: 'Telegram Bot Token (from @BotFather)', type: 'string', required: true },
        ],
        outputs: [
          { key: 'message_text', label: 'Message Text Content', type: 'string', required: true },
          { key: 'chat_id', label: 'Telegram Chat ID', type: 'number', required: true },
          { key: 'user_id', label: 'Sender User ID', type: 'number', required: true },
          { key: 'username', label: 'Sender Username', type: 'string', required: false },
          { key: 'first_name', label: 'First Name', type: 'string', required: false },
          { key: 'last_name', label: 'Last Name', type: 'string', required: false },
          { key: 'timestamp', label: 'Received Timestamp', type: 'string', required: true },
          { key: 'message_id', label: 'Message ID', type: 'number', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'send_message',
        name: 'Send Telegram Message',
        description: 'Sends a chat message, markdown alert, or automated response to a specified Telegram chat.',
        type: 'action',
        inputs: [
          { key: 'chat_id', label: 'Telegram Chat ID (e.g. {{trigger.chat_id}})', type: 'string', required: true },
          { key: 'message_text', label: 'Message Text (Supports Markdown/HTML)', type: 'string', required: true },
          { key: 'parse_mode', label: 'Formatting Mode (MarkdownV2, HTML, or Markdown)', type: 'string', required: false },
          { key: 'reply_to_message_id', label: 'Reply to Message ID (Optional)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'message_id', label: 'Sent Message ID', type: 'number', required: true },
          { key: 'chat_id', label: 'Recipient Chat ID', type: 'number', required: true },
          { key: 'status', label: 'Delivery Status', type: 'string', required: true },
          { key: 'sent_at', label: 'Timestamp', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'command-router',
    name: 'AI Command Router',
    description: 'Uses AI to parse natural language user messages into structured intent and route execution to the correct workflow branch.',
    category: 'Logic',
    icon: '/icons/router.svg',
    authType: 'none',
    triggers: [],
    actions: [
      {
        id: 'route_intent',
        name: 'Route Natural Language Intent',
        description: 'Analyzes user text message against branch intent descriptions and outputs the matching branch ID.',
        type: 'action',
        inputs: [
          { key: 'input_text', label: 'User Message Text (e.g. {{trigger.message_text}})', type: 'string', required: true },
          { key: 'branches', label: 'Branch Intent Definitions (JSON Array or List)', type: 'string', required: true },
          { key: 'fallbackBranch', label: 'Default Fallback Branch ID (Optional)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'matchedBranch', label: 'Matched Branch ID', type: 'string', required: true },
          { key: 'confidence', label: 'Confidence Score (0-1)', type: 'number', required: true },
          { key: 'reasoning', label: 'AI Classification Reasoning', type: 'string', required: true },
          { key: 'input_text', label: 'Original Message Text', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send template messages, receive customer replies & dispatch notifications.',
    category: 'Communication',
    icon: '/icons/whatsapp.svg',
    authType: 'api_key',
    triggers: [
      {
        id: 'inbound_whatsapp',
        name: 'Inbound Customer Reply',
        description: 'Triggers when a customer sends a message to your WhatsApp number.',
        type: 'trigger',
        inputs: [],
        outputs: [
          { key: 'from', label: 'Sender Phone Number', type: 'string', required: true },
          { key: 'profileName', label: 'Customer WhatsApp Profile Name', type: 'string', required: true },
          { key: 'messageText', label: 'Message Text Content', type: 'string', required: true },
          { key: 'messageId', label: 'WhatsApp Message ID', type: 'string', required: true },
          { key: 'timestamp', label: 'Message Received Timestamp', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'send_message',
        name: 'Send WhatsApp Notification',
        description: 'Sends a WhatsApp text message to a customer.',
        type: 'action',
        inputs: [
          { key: 'phone', label: 'Recipient Phone Number (E.164 format e.g. +14155552671)', type: 'string', required: true },
          { key: 'text', label: 'Message Text Content', type: 'string', required: true },
          { key: 'templateName', label: 'Approved Template Name (Optional)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'messageId', label: 'WhatsApp Message WAMID', type: 'string', required: true },
          { key: 'recipientPhone', label: 'Recipient Phone', type: 'string', required: true },
          { key: 'status', label: 'Delivery Status (sent/queued)', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'twilio',
    name: 'Twilio SMS',
    description: 'Send SMS text messages, dispatch WhatsApp templates & initiate voice calls.',
    category: 'Communication',
    icon: '/icons/twilio.svg',
    authType: 'api_key',
    triggers: [],
    actions: [
      {
        id: 'send_sms',
        name: 'Send SMS Text Message',
        description: 'Sends an SMS text message via Twilio REST API.',
        type: 'action',
        inputs: [
          { key: 'to', label: 'Recipient Phone Number (+1234567890)', type: 'string', required: true },
          { key: 'from', label: 'Twilio Sender Phone Number', type: 'string', required: true },
          { key: 'body', label: 'SMS Body Text Content', type: 'string', required: true },
        ],
        outputs: [
          { key: 'sid', label: 'Twilio Message SID', type: 'string', required: true },
          { key: 'status', label: 'Twilio Status (queued/sent)', type: 'string', required: true },
          { key: 'price', label: 'SMS Unit Price', type: 'string', required: false },
        ],
      },
    ],
  },

  // E-Commerce & Payments
  {
    id: 'stripe',
    name: 'Stripe Payments',
    description: 'Process credit cards, listen for successful charges, manage subscriptions & customers.',
    category: 'Payments & E-Commerce',
    icon: '/icons/stripe.svg',
    authType: 'api_key',
    triggers: [
      {
        id: 'new_charge',
        name: 'New Successful Payment Charge',
        description: 'Triggers when a new customer payment succeeds in Stripe.',
        type: 'trigger',
        inputs: [],
        outputs: [
          { key: 'chargeId', label: 'Stripe Charge ID (ch_xxx)', type: 'string', required: true },
          { key: 'amount', label: 'Charge Amount (in cents/unit)', type: 'number', required: true },
          { key: 'currency', label: 'Currency Code (usd, eur, inr)', type: 'string', required: true },
          { key: 'customerEmail', label: 'Customer Billing Email', type: 'string', required: true },
          { key: 'customerName', label: 'Customer Full Name', type: 'string', required: true },
          { key: 'receiptUrl', label: 'Stripe Web Receipt URL', type: 'string', required: true },
          { key: 'created', label: 'Charge Created Unix Timestamp', type: 'number', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'create_customer',
        name: 'Create Stripe Customer',
        description: 'Creates a new customer profile in Stripe.',
        type: 'action',
        inputs: [
          { key: 'email', label: 'Customer Email Address', type: 'string', required: true },
          { key: 'name', label: 'Customer Full Name', type: 'string', required: true },
          { key: 'phone', label: 'Phone Number', type: 'string', required: false },
          { key: 'description', label: 'Account Description / Memo', type: 'string', required: false },
        ],
        outputs: [
          { key: 'customerId', label: 'Stripe Customer ID (cus_xxx)', type: 'string', required: true },
          { key: 'email', label: 'Registered Email', type: 'string', required: true },
          { key: 'created', label: 'Created Timestamp', type: 'number', required: true },
        ],
      },
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify Store',
    description: 'Track new orders, update product inventories, fulfill shipments & manage customers.',
    category: 'Payments & E-Commerce',
    icon: '/icons/shopify.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_order',
        name: 'New Paid Order Placed',
        description: 'Triggers when a customer places a new paid order.',
        type: 'trigger',
        inputs: [],
        outputs: [
          { key: 'orderId', label: 'Shopify Order ID', type: 'string', required: true },
          { key: 'orderNumber', label: 'Order Number (#1001)', type: 'string', required: true },
          { key: 'totalPrice', label: 'Order Total Price', type: 'string', required: true },
          { key: 'currency', label: 'Store Currency', type: 'string', required: true },
          { key: 'customerEmail', label: 'Customer Email', type: 'string', required: true },
          { key: 'customerName', label: 'Customer Full Name', type: 'string', required: true },
          { key: 'lineItemsCount', label: 'Total Items Count', type: 'number', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'create_product',
        name: 'Create Store Product',
        description: 'Creates a new product listing in your Shopify store catalog.',
        type: 'action',
        inputs: [
          { key: 'title', label: 'Product Title', type: 'string', required: true },
          { key: 'body_html', label: 'Product Description (HTML)', type: 'string', required: false },
          { key: 'vendor', label: 'Vendor Brand Name', type: 'string', required: false },
          { key: 'product_type', label: 'Product Category Type', type: 'string', required: false },
          { key: 'price', label: 'Product Price Amount', type: 'string', required: true },
        ],
        outputs: [
          { key: 'productId', label: 'Shopify Product ID', type: 'string', required: true },
          { key: 'title', label: 'Product Title', type: 'string', required: true },
          { key: 'handle', label: 'Product URL Handle', type: 'string', required: true },
        ],
      },
    ],
  },

  // CRM & Sales
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    description: 'Sync leads, update CRM contacts, create sales deals & log pipeline activities.',
    category: 'CRM & Sales',
    icon: '/icons/hubspot.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_contact',
        name: 'New Contact Created',
        description: 'Triggers when a new lead contact is added to HubSpot CRM.',
        type: 'trigger',
        inputs: [],
        outputs: [
          { key: 'vid', label: 'HubSpot Contact VID', type: 'string', required: true },
          { key: 'email', label: 'Contact Email', type: 'string', required: true },
          { key: 'firstname', label: 'First Name', type: 'string', required: true },
          { key: 'lastname', label: 'Last Name', type: 'string', required: true },
          { key: 'company', label: 'Company Name', type: 'string', required: false },
          { key: 'phone', label: 'Phone Number', type: 'string', required: false },
          { key: 'createdate', label: 'Creation Timestamp', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'create_deal',
        name: 'Create Sales Deal',
        description: 'Creates a new deal in the HubSpot sales pipeline.',
        type: 'action',
        inputs: [
          { key: 'dealname', label: 'Deal Name', type: 'string', required: true },
          { key: 'pipeline', label: 'Sales Pipeline ID (Default: default)', type: 'string', required: false },
          { key: 'dealstage', label: 'Deal Stage (e.g. appointmentscheduled)', type: 'string', required: true },
          { key: 'amount', label: 'Deal Revenue Value ($)', type: 'string', required: true },
          { key: 'closedate', label: 'Expected Close Date (ISO date)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'dealId', label: 'HubSpot Deal ID', type: 'string', required: true },
          { key: 'dealname', label: 'Deal Name', type: 'string', required: true },
          { key: 'amount', label: 'Deal Amount', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'salesforce',
    name: 'Salesforce Enterprise',
    description: 'Create Leads, query Accounts, update Opportunities & automate Enterprise workflows.',
    category: 'CRM & Sales',
    icon: '/icons/salesforce.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_lead',
        name: 'New Lead Created in Salesforce',
        description: 'Triggers when a new Lead record is created.',
        type: 'trigger',
        inputs: [],
        outputs: [
          { key: 'leadId', label: 'Salesforce Lead ID (00Qxx)', type: 'string', required: true },
          { key: 'email', label: 'Lead Email Address', type: 'string', required: true },
          { key: 'firstName', label: 'First Name', type: 'string', required: true },
          { key: 'lastName', label: 'Last Name', type: 'string', required: true },
          { key: 'company', label: 'Company Name', type: 'string', required: true },
          { key: 'leadSource', label: 'Lead Source Channel', type: 'string', required: false },
        ],
      },
    ],
    actions: [
      {
        id: 'create_lead',
        name: 'Create Salesforce Lead',
        description: 'Creates a new Lead object record in Salesforce.',
        type: 'action',
        inputs: [
          { key: 'firstName', label: 'First Name', type: 'string', required: true },
          { key: 'lastName', label: 'Last Name', type: 'string', required: true },
          { key: 'email', label: 'Lead Email', type: 'string', required: true },
          { key: 'company', label: 'Company Name', type: 'string', required: true },
          { key: 'phone', label: 'Phone Number', type: 'string', required: false },
          { key: 'status', label: 'Lead Status (e.g. Open - Not Contacted)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'leadId', label: 'Salesforce Lead ID', type: 'string', required: true },
          { key: 'success', label: 'Success Boolean', type: 'boolean', required: true },
        ],
      },
    ],
  },

  // Developer Tools
  {
    id: 'github',
    name: 'GitHub',
    description: 'Listen for commit pushes, open repository issues, create pull requests & dispatch webhooks.',
    category: 'Developer Tools',
    icon: '/icons/github.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_issue',
        name: 'New Issue Opened in Repository',
        description: 'Triggers when a new issue is submitted.',
        type: 'trigger',
        inputs: [
          { key: 'owner', label: 'Repository Owner / Org Name', type: 'string', required: true },
          { key: 'repo', label: 'Repository Name', type: 'string', required: true },
        ],
        outputs: [
          { key: 'issueNumber', label: 'Issue Number (#42)', type: 'number', required: true },
          { key: 'title', label: 'Issue Title', type: 'string', required: true },
          { key: 'body', label: 'Issue Description Content', type: 'string', required: true },
          { key: 'author', label: 'Author GitHub Username', type: 'string', required: true },
          { key: 'issueUrl', label: 'GitHub Issue Web URL', type: 'string', required: true },
          { key: 'createdAt', label: 'Created Timestamp', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'create_issue',
        name: 'Create Repository Issue',
        description: 'Opens a new issue in a target GitHub repository.',
        type: 'action',
        inputs: [
          { key: 'owner', label: 'Repository Owner / Organization', type: 'string', required: true },
          { key: 'repo', label: 'Repository Name', type: 'string', required: true },
          { key: 'title', label: 'Issue Title', type: 'string', required: true },
          { key: 'body', label: 'Issue Markdown Description', type: 'string', required: false },
          { key: 'labels', label: 'Labels (Comma separated e.g. bug,enhancement)', type: 'string', required: false },
          { key: 'assignees', label: 'Assignee Usernames (Comma separated)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'issueNumber', label: 'Created Issue Number', type: 'number', required: true },
          { key: 'issueUrl', label: 'GitHub Issue Web URL', type: 'string', required: true },
          { key: 'nodeId', label: 'GraphQL Node ID', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'jira',
    name: 'Atlassian Jira',
    description: 'Track software bugs, create project tickets, transition issues & update agile boards.',
    category: 'Developer Tools',
    icon: '/icons/jira.svg',
    authType: 'oauth2',
    triggers: [],
    actions: [
      {
        id: 'create_issue',
        name: 'Create Jira Ticket / Issue',
        description: 'Creates a new ticket in Jira project workspace.',
        type: 'action',
        inputs: [
          { key: 'projectKey', label: 'Jira Project Key (e.g. PROJ)', type: 'string', required: true },
          { key: 'issueType', label: 'Issue Type (e.g. Bug, Task, Story)', type: 'string', required: true },
          { key: 'summary', label: 'Ticket Summary Title', type: 'string', required: true },
          { key: 'description', label: 'Detailed Description', type: 'string', required: false },
          { key: 'priority', label: 'Priority Level (e.g. High, Medium, Low)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'issueKey', label: 'Jira Issue Key (PROJ-123)', type: 'string', required: true },
          { key: 'issueId', label: 'Internal Issue ID', type: 'string', required: true },
          { key: 'selfUrl', label: 'REST API Self Link', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'notion',
    name: 'Notion Workspace',
    description: 'Add pages to Notion databases, update page properties & append block content.',
    category: 'Productivity',
    icon: '/icons/notion.svg',
    authType: 'oauth2',
    triggers: [],
    actions: [
      {
        id: 'create_page',
        name: 'Create Database Page Row',
        description: 'Adds a new page row to a Notion Database.',
        type: 'action',
        inputs: [
          { key: 'databaseId', label: 'Notion Database ID', type: 'string', required: true },
          { key: 'pageTitle', label: 'Page Title Name', type: 'string', required: true },
          { key: 'propertiesJson', label: 'Database Properties (JSON or text)', type: 'string', required: false },
          { key: 'contentMarkdown', label: 'Page Body Markdown Content', type: 'string', required: false },
        ],
        outputs: [
          { key: 'pageId', label: 'Notion Page ID', type: 'string', required: true },
          { key: 'pageUrl', label: 'Notion Web Page URL', type: 'string', required: true },
          { key: 'createdTime', label: 'Created Timestamp', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Add records, query views, update cell fields & automate relational databases.',
    category: 'Productivity',
    icon: '/icons/airtable.svg',
    authType: 'api_key',
    triggers: [],
    actions: [
      {
        id: 'create_record',
        name: 'Create Base Record',
        description: 'Creates a new row record in an Airtable base table.',
        type: 'action',
        inputs: [
          { key: 'baseId', label: 'Airtable Base ID (appXxxx)', type: 'string', required: true },
          { key: 'tableName', label: 'Table Name or ID', type: 'string', required: true },
          { key: 'fieldsJson', label: 'Field Values (JSON object e.g. {"Name": "Alex", "Email": "alex@ex.com"})', type: 'string', required: true },
        ],
        outputs: [
          { key: 'recordId', label: 'Airtable Record ID (recXxxx)', type: 'string', required: true },
          { key: 'createdTime', label: 'Created Time', type: 'string', required: true },
        ],
      },
    ],
  },
  {
    id: 'web-search',
    name: 'AI Web Search Client',
    description: 'Execute live web search queries and extract real-time intelligence.',
    category: 'Developer Tools',
    icon: '/icons/search.svg',
    authType: 'api_key',
    triggers: [],
    actions: [
      {
        id: 'search_web',
        name: 'Execute Live Web Search',
        description: 'Runs web search query across search engines.',
        type: 'action',
        inputs: [
          { key: 'query', label: 'Search Query Term', type: 'string', required: true },
          { key: 'numResults', label: 'Max Search Results Count (Default: 5)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'query', label: 'Original Query', type: 'string', required: true },
          { key: 'summaryResult', label: 'Synthesized Answer Summary', type: 'string', required: true },
          { key: 'citations', label: 'Citations Array', type: 'json', required: true },
        ],
      },
    ],
  },
  {
    id: 'http-request',
    name: 'HTTP Request Call',
    description: 'Send custom REST API GET, POST, PUT, or DELETE requests to any endpoint.',
    category: 'Developer Tools',
    icon: '/icons/webhook.svg',
    authType: 'none',
    triggers: [],
    actions: [
      {
        id: 'custom_api_call',
        name: 'Execute Custom HTTP Request',
        description: 'Sends custom API call to external web endpoint.',
        type: 'action',
        inputs: [
          { key: 'method', label: 'HTTP Method (GET, POST, PUT, DELETE)', type: 'string', required: true },
          { key: 'url', label: 'Target API Endpoint URL', type: 'string', required: true },
          { key: 'headers', label: 'Custom HTTP Headers (JSON or key:value)', type: 'string', required: false },
          { key: 'bodyPayload', label: 'JSON Request Body Payload', type: 'string', required: false },
        ],
        outputs: [
          { key: 'statusCode', label: 'HTTP Status Code (200, 201)', type: 'number', required: true },
          { key: 'responseData', label: 'Response Body Data (JSON)', type: 'json', required: true },
          { key: 'headers', label: 'Response Headers', type: 'json', required: false },
        ],
      },
    ],
  },
  {
    id: 'autoflow-condition',
    name: 'If / Else Logic Condition',
    description: 'Split workflow execution paths into TRUE and FALSE branches based on rules.',
    category: 'Logic & Control Flow',
    icon: '/icons/condition.svg',
    authType: 'none',
    triggers: [],
    actions: [
      {
        id: 'if_else',
        name: 'If / Else Rule Evaluation',
        description: 'Evaluates condition rule against step variables.',
        type: 'action',
        inputs: [
          { key: 'leftValue', label: 'Test Variable Value (e.g. {{trigger.amount}})', type: 'string', required: true },
          { key: 'operator', label: 'Comparison Operator (equals, greater_than, contains)', type: 'string', required: true },
          { key: 'rightValue', label: 'Expected Target Value', type: 'string', required: true },
        ],
        outputs: [
          { key: 'matchedBranch', label: 'Matched Branch Result ("true" or "false")', type: 'string', required: true },
          { key: 'isMatch', label: 'Boolean Match Status', type: 'boolean', required: true },
        ],
      },
    ],
  },
];

export function getManifestById(connectorId: string): ConnectorManifest | undefined {
  // Try the class registry first (has full-power manifests), fall back to static array
  const cleanId = connectorId.replace('autoflow-', '');
  return (
    manifestRegistry.getManifest(connectorId) ||
    manifestRegistry.getManifest(cleanId) ||
    _STATIC_MANIFESTS.find(
      (m: ConnectorManifest) => m.id === connectorId || m.id === cleanId
    )
  );
}

export function getActionOrTriggerSchema(connectorId: string, operationId: string) {
  const manifest = getManifestById(connectorId);
  if (!manifest) return null;

  // 1. Exact match
  const exactAction = manifest.actions.find((a) => a.id === operationId);
  if (exactAction) return exactAction;

  const exactTrigger = manifest.triggers.find((t) => t.id === operationId);
  if (exactTrigger) return exactTrigger;

  // 2. Default to primary action or trigger of the connector
  return manifest.actions[0] || manifest.triggers[0] || null;
}

// ─── Connector Prompt Aliases ──────────────────────────────────────────────────
// Used by exportForAI() to match user prompt keywords to connector IDs

const CONNECTOR_PROMPT_ALIASES: Record<string, string[]> = {
  'openai':          ['gpt', 'chatgpt', 'openai', 'gpt-4', 'gpt4', 'gpt 4', 'ai text'],
  'anthropic':       ['claude', 'anthropic', 'sonnet', 'haiku', 'opus'],
  'google-sheets':   ['sheets', 'spreadsheet', 'google sheets', 'worksheet'],
  'google-drive':    ['drive', 'gdrive', 'google drive'],
  'google-calendar': ['calendar', 'google calendar', 'gcal', 'event', 'meeting'],
  'github':          ['github', 'repo', 'repository', 'pull request', 'pr', 'issue', 'commit'],
  'slack':           ['slack', 'channel', '#general', 'workspace message'],
  'gmail':           ['gmail', 'email', 'mail', 'inbox', 'send email'],
  'notion':          ['notion', 'workspace', 'database page', 'notion page'],
  'stripe':          ['stripe', 'payment', 'invoice', 'customer', 'subscription', 'billing'],
  'hubspot':         ['hubspot', 'crm', 'contact', 'deal', 'lead', 'hubspot crm'],
  'jira':            ['jira', 'ticket', 'sprint', 'board', 'jira issue'],
  'telegram':        ['telegram', 'bot', 'tg', 'telegram bot'],
  'whatsapp':        ['whatsapp', 'wa', 'whats app', 'meta cloud'],
  'google-search':   ['search', 'google search', 'web search', 'serpapi'],
  'ms-teams':        ['teams', 'microsoft teams', 'teams channel', 'msteams'],
  'ms-outlook':      ['outlook', 'microsoft outlook', 'outlook mail', 'office365 email'],
  'ms-excel':        ['excel', 'microsoft excel', 'excel online', 'workbook'],
  'dropbox':         ['dropbox', 'cloud storage', 'dropbox file'],
  'zoom':            ['zoom', 'meeting', 'zoom meeting', 'webinar', 'recording'],
  'woocommerce':     ['woocommerce', 'woo', 'wc order', 'wordpress store'],
  'paypal':          ['paypal', 'payout', 'paypal payment'],
  'mailchimp':       ['mailchimp', 'audience', 'newsletter', 'mailchimp list'],
  'trello':          ['trello', 'trello card', 'trello board'],
  'calendly':        ['calendly', 'booking', 'appointment', 'calendly event'],
  'pipedrive':       ['pipedrive', 'pipedrive deal', 'pipedrive crm'],
  'asana':           ['asana', 'asana task', 'asana project'],
  'monday':          ['monday', 'monday.com', 'monday board'],
  'instagram':       ['instagram', 'ig', 'insta post', 'ig comment'],
  'facebook':        ['facebook', 'fb page', 'facebook lead', 'lead ad'],
  'meta-messenger':  ['messenger', 'fb messenger', 'meta messenger'],
  'activecampaign':  ['activecampaign', 'ac contact', 'ac tag'],
  'google-gemini':   ['gemini', 'google gemini', 'gemini 1.5', 'gemini flash'],
  'ai-document-ocr': ['ocr', 'invoice ocr', 'receipt extract', 'document ocr'],
  'gitlab':          ['gitlab', 'merge request', 'mr', 'gitlab issue'],
  'linear':          ['linear', 'linear issue', 'linear cycle'],
  'vercel':          ['vercel', 'vercel deploy', 'next.js deploy'],
  'quickbooks':      ['quickbooks', 'qbo', 'quickbooks invoice'],
  'docusign':        ['docusign', 'signature', 'envelope', 'e-sign'],
  'webhook-trigger': ['webhook', 'catch webhook', 'inbound webhook'],
};

// ─── ConnectorManifestRegistry Class ──────────────────────────────────────────

export class ConnectorManifestRegistry {
  private manifests = new Map<string, ConnectorManifest>();

  /** Register a connector manifest. Later registrations overwrite earlier ones with same ID. */
  register(manifest: ConnectorManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  /** Register multiple manifests at once. */
  registerAll(manifests: ConnectorManifest[]): void {
    for (const m of manifests) this.register(m);
  }

  getManifest(id: string): ConnectorManifest | undefined {
    return this.manifests.get(id);
  }

  getAllManifests(): ConnectorManifest[] {
    return [...this.manifests.values()];
  }

  getTrigger(connectorId: string, triggerId: string) {
    return this.getManifest(connectorId)?.triggers.find(t => t.id === triggerId);
  }

  getAction(connectorId: string, actionId: string) {
    return this.getManifest(connectorId)?.actions.find(a => a.id === actionId);
  }

  getConnectorsWithTriggers(): ConnectorManifest[] {
    return this.getAllManifests().filter(m => m.triggers.length > 0);
  }

  /** Fuzzy keyword search across name, description, action names, trigger names */
  search(query: string): ConnectorManifest[] {
    const q = query.toLowerCase();
    return this.getAllManifests().filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.actions.some(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) ||
      m.triggers.some(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
    );
  }

  /**
   * Scoped export for the AI workflow generation engine.
   *
   * Strategy (Patch 1 / Gap 3):
   * - When connectedAppIds.length <= 4: inject all full schemas
   * - When > 4: keyword-score prompt against connector names/aliases, pick top 4 by score
   *   then recency; remaining connected apps become stubs with a LLM note
   * - All unconnected connectors: lightweight { id, name } stubs only
   */
  exportForAI(
    connectedAppIds: string[],
    prompt: string,
    userConnections: Array<{ appId: string; createdAt: Date }>
  ): AIConnectorIndex {
    let selectedIds: string[];

    if (connectedAppIds.length <= 4) {
      selectedIds = [...connectedAppIds];
    } else {
      // Score each connected connector by keyword match in prompt
      const p = prompt.toLowerCase();
      const scored = connectedAppIds.map(id => {
        const manifest = this.manifests.get(id);
        const nameMatch  = manifest && p.includes(manifest.name.toLowerCase()) ? 3 : 0;
        const idMatch    = p.includes(id.toLowerCase()) ? 2 : 0;
        const aliasMatch = (CONNECTOR_PROMPT_ALIASES[id] || [])
          .some(alias => p.includes(alias)) ? 2 : 0;
        // Recency tiebreaker — newer connections sorted last (lower index = older)
        const conn = userConnections.find(c => c.appId === id);
        const recencyScore = conn ? conn.createdAt.getTime() : 0;
        return { id, score: nameMatch + idMatch + aliasMatch, recencyScore };
      });
      scored.sort((a, b) => b.score - a.score || b.recencyScore - a.recencyScore);
      selectedIds = scored.slice(0, 4).map(s => s.id);
    }

    const droppedConnectedApps = connectedAppIds
      .filter(id => !selectedIds.includes(id))
      .map(id => this.getManifest(id)?.name || id);

    const fullSchemas = selectedIds
      .map(id => this.manifests.get(id))
      .filter((m): m is ConnectorManifest => Boolean(m));

    const catalog = this.getAllManifests()
      .filter(m => !selectedIds.includes(m.id))
      .map(m => ({ id: m.id, name: m.name }));

    return { fullSchemas, catalog, droppedConnectedApps };
  }

  /** Lightweight summary for the Registry API list endpoint */
  getSummaries() {
    return this.getAllManifests().map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      icon: m.icon,
      authType: m.authType,
      triggerCount: m.triggers.length,
      actionCount: m.actions.length,
      docsUrl: m.docsUrl,
      version: m.version,
    }));
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────────

export const manifestRegistry = new ConnectorManifestRegistry();

// Auto-seed with the existing static manifests.
// Individual connector classes (GmailConnector, etc.) call manifestRegistry.register()
// in their own module — this seeds the built-in catalog manifests.
manifestRegistry.registerAll(_STATIC_MANIFESTS);

// ─── Backward Compatibility ────────────────────────────────────────────────────
//
// IMPORTANT (Patch 3): The old `ALL_50_CONNECTOR_MANIFESTS` const is preserved
// as a lazy Proxy. A plain const assignment would evaluate at import time —
// BEFORE connector classes self-register — and return an empty array.
// The Proxy evaluates at access time, after all connectors have registered.
//
// This means any existing code using ALL_50_CONNECTOR_MANIFESTS[0] or
// ALL_50_CONNECTOR_MANIFESTS.find(...) will still work correctly.

export const ALL_50_CONNECTOR_MANIFESTS: ConnectorManifest[] = new Proxy(
  [] as ConnectorManifest[],
  {
    get(_, prop) {
      const all = manifestRegistry.getAllManifests();
      if (prop === 'length') return all.length;
      if (prop === Symbol.iterator) return all[Symbol.iterator].bind(all);
      if (typeof prop === 'string' && !isNaN(Number(prop))) return all[Number(prop)];
      const val = (all as any)[prop];
      return typeof val === 'function' ? val.bind(all) : val;
    },
  }
);

/** Preferred alternative to ALL_50_CONNECTOR_MANIFESTS — call at any time */
export const getAllConnectorManifests = (): ConnectorManifest[] =>
  manifestRegistry.getAllManifests();

