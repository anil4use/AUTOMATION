/**
 * Pattern Rules — Auto-Detection Engine
 *
 * Applied by seed-field-catalog.ts to every field in every connector manifest.
 * Detects semantic role and format from field key name + label patterns.
 *
 * This is the ONLY place where connector-specific knowledge is "baked in" —
 * e.g. that Stripe uses cents, that WhatsApp requires E.164 phone format.
 * Everything else (the actual per-field entries) goes into MongoDB.
 */

export interface DetectedRoles {
  role: string | null;
  format: string | null;
  confidence: number;    // 0–1
  synonyms: string[];
  transformHints: string[];
  notes: string;
}

// Connectors known to output amounts as integer cents
const CENTS_CONNECTORS = new Set(['stripe', 'braintree', 'square', 'adyen']);

// Connectors known to output unix timestamps in SECONDS (not ms)
const UNIX_SECONDS_CONNECTORS = new Set(['stripe', 'paypal', 'braintree', 'square', 'github', 'gitlab']);

// Connectors that REQUIRE E.164 phone format on input
const E164_REQUIRED_CONNECTORS = new Set(['whatsapp', 'twilio', 'vonage', 'messagebird', 'plivo', 'telnyx']);

export const PATTERN_RULES = {
  /**
   * Detect semantic role and format for a single field.
   * Called once per field during seeding.
   */
  detect(
    connectorId: string,
    fieldKey: string,
    fieldLabel: string,
    fieldType: string
  ): DetectedRoles {
    const key   = fieldKey.toLowerCase();
    const label = (fieldLabel || '').toLowerCase();
    const cid   = connectorId.toLowerCase();

    // ── Email Address ─────────────────────────────────────────────────────
    if (
      /^(email|email_address|from|to|cc|bcc|reply_to|replyto)$/.test(key) ||
      /email/.test(key) ||
      /email/.test(label)
    ) {
      return {
        role: 'email_address', format: 'email', confidence: 0.95,
        synonyms: ['email', 'from', 'to', 'customerEmail', 'sender', 'recipient', 'email_address'],
        transformHints: ['extract_email_from_name_format'],
        notes: 'May contain "Name <email>" format — extract plain email when needed',
      };
    }

    // ── Phone Number ──────────────────────────────────────────────────────
    if (/^(phone|mobile|tel|telephone|whatsapp|sms|cell|phonenumber|mobilenumber)/.test(key)) {
      const requiresE164 = E164_REQUIRED_CONNECTORS.has(cid);
      return {
        role: 'phone_number',
        format: requiresE164 ? 'phone_e164' : null,
        confidence: 0.92,
        synonyms: ['phone', 'mobile', 'tel', 'telephone', 'to'],
        transformHints: requiresE164 ? ['normalize_to_e164'] : [],
        notes: requiresE164
          ? `${connectorId} REQUIRES E.164 format: +14155552671. Any other format will fail.`
          : '',
      };
    }

    // ── Unix Timestamp ────────────────────────────────────────────────────
    if (
      /^(created|updated|modified|timestamp|time)$/.test(key) ||
      /(created_at|updated_at|modified_at|sent_at|received_at|completed_at|closed_at)/.test(key) ||
      (fieldType === 'number' && /^(created|updated|timestamp)/.test(key))
    ) {
      const isUnixConnector = UNIX_SECONDS_CONNECTORS.has(cid);
      return {
        role: 'timestamp',
        format: isUnixConnector ? 'unix_timestamp' : 'iso_date',
        confidence: 0.88,
        synonyms: ['date', 'createdAt', 'updatedAt', 'timestamp', 'time', 'created', 'updated'],
        transformHints: isUnixConnector ? ['unix_seconds_to_iso'] : [],
        notes: isUnixConnector
          ? `${connectorId} outputs unix SECONDS (integer), not ISO date. Multiply by 1000 for JS Date.`
          : '',
      };
    }

    // ── ISO Date / Date-string ────────────────────────────────────────────
    if (
      /(at|date|_date|time)$/.test(key) ||
      /^(date|startdate|enddate|duedate|closedate)/.test(key)
    ) {
      return {
        role: 'timestamp', format: 'iso_date', confidence: 0.80,
        synonyms: ['date', 'createdAt', 'timestamp', 'startTime', 'endTime', 'dueDate'],
        transformHints: [],
        notes: '',
      };
    }

    // ── Money Amount ──────────────────────────────────────────────────────
    if (
      /^(amount|price|total|totalprice|cost|fee|charge|revenue|value|subtotal|grandtotal|unitprice|saleprice)$/.test(key) ||
      /(amount|price|total|cost|fee)$/.test(key)
    ) {
      const usesCents  = CENTS_CONNECTORS.has(cid);
      return {
        role: 'amount_money',
        format: usesCents ? 'currency_cents' : 'currency_dollars',
        confidence: 0.88,
        synonyms: ['amount', 'price', 'total', 'cost', 'value', 'fee', 'chargeAmount'],
        transformHints: usesCents ? ['cents_to_dollars_required'] : [],
        notes: usesCents
          ? `${connectorId} outputs amounts as INTEGER CENTS. 4999 = $49.99. Divide by 100 for dollars.`
          : '',
      };
    }

    // ── Currency Code ─────────────────────────────────────────────────────
    if (/^(currency|currency_code|iso_currency|currencycode)$/.test(key)) {
      return {
        role: 'currency_code', format: null, confidence: 0.97,
        synonyms: ['currency', 'currencyCode', 'iso_currency'],
        transformHints: ['uppercase_iso4217'],
        notes: 'ISO 4217 currency code: USD, EUR, INR, GBP',
      };
    }

    // ── Message / Body Content ────────────────────────────────────────────
    if (
      /^(text|body|content|message|msg|description|note|comment|prompt|result|summary|caption)$/.test(key) ||
      /^(message_text|bodyplain|bodyhtml|body_plain|body_html)$/.test(key)
    ) {
      const isHtml = /html/i.test(key) || /html/i.test(label);
      return {
        role: 'message_content',
        format: isHtml ? 'html' : null,
        confidence: 0.90,
        synonyms: ['text', 'body', 'content', 'message', 'description', 'bodyPlain', 'msg'],
        transformHints: isHtml ? ['strip_html_tags'] : [],
        notes: '',
      };
    }

    // ── Title / Subject ───────────────────────────────────────────────────
    if (
      /^(subject|title|name|summary|headline|dealname|issuetitle|taskname|topic|cardname|pagename)$/.test(key) ||
      /(title|subject|summary)$/.test(key)
    ) {
      return {
        role: 'title_subject', format: null, confidence: 0.85,
        synonyms: ['subject', 'title', 'name', 'summary', 'headline', 'dealname'],
        transformHints: [],
        notes: '',
      };
    }

    // ── Description / Long Body ───────────────────────────────────────────
    if (/^(description|body|details|notes|comment|bio|about)$/.test(key)) {
      return {
        role: 'description_body', format: null, confidence: 0.80,
        synonyms: ['description', 'body', 'details', 'notes', 'comment'],
        transformHints: [],
        notes: '',
      };
    }

    // ── URL / Link ────────────────────────────────────────────────────────
    if (/url|link|href|website|domain/.test(key)) {
      return {
        role: 'url_link', format: 'url', confidence: 0.92,
        synonyms: ['url', 'link', 'href', 'website', 'fileUrl', 'pageUrl'],
        transformHints: ['ensure_https_scheme'],
        notes: '',
      };
    }

    // ── First Name ────────────────────────────────────────────────────────
    if (/^(firstname|fname|givenname|first_name)$/.test(key)) {
      return {
        role: 'first_name', format: null, confidence: 0.97,
        synonyms: ['firstName', 'fname', 'givenName', 'first_name'],
        transformHints: [],
        notes: '',
      };
    }

    // ── Last Name ─────────────────────────────────────────────────────────
    if (/^(lastname|lname|surname|familyname|last_name)$/.test(key)) {
      return {
        role: 'last_name', format: null, confidence: 0.97,
        synonyms: ['lastName', 'lname', 'surname', 'familyName'],
        transformHints: [],
        notes: '',
      };
    }

    // ── Full Name ─────────────────────────────────────────────────────────
    if (/^(fullname|customername|contactname|full_name|displayname)/.test(key)) {
      return {
        role: 'full_name', format: null, confidence: 0.90,
        synonyms: ['fullName', 'customerName', 'name', 'contactName'],
        transformHints: ['may_need_split_to_first_last'],
        notes: 'May need to be split into firstName/lastName for CRM connectors',
      };
    }

    // ── System ID ─────────────────────────────────────────────────────────
    if (/^(id|_id|uid|guid|uuid|objectid)$/.test(key) || /(id|_id)$/.test(fieldKey)) {
      return {
        role: 'unique_id', format: null, confidence: 0.78,
        synonyms: ['id', 'uid', 'objectId'],
        transformHints: ['do_not_map_cross_connector'],
        notes: 'System IDs are connector-specific — usually should NOT be mapped to another connector',
      };
    }

    // ── Status / State ────────────────────────────────────────────────────
    if (/^(status|state|stage|phase|type|dealstage|issuetype)$/.test(key)) {
      return {
        role: 'status', format: null, confidence: 0.78,
        synonyms: ['status', 'state', 'stage', 'phase'],
        transformHints: [],
        notes: 'Enum values differ between connectors — AI should map semantically',
      };
    }

    // ── Channel ID (Messaging) ────────────────────────────────────────────
    if (/^(channel|channelid|chat_id|chatid|webhookurl)/.test(key)) {
      return {
        role: 'channel_id', format: null, confidence: 0.85,
        synonyms: ['channel', 'channelId', 'chat_id', 'webhookUrl'],
        transformHints: [],
        notes: 'Messaging channel identifier — format varies by connector',
      };
    }

    // ── Tags / Labels ─────────────────────────────────────────────────────
    if (/^(tags|labels|categories|keywords|hashtags)$/.test(key)) {
      return {
        role: 'tags_list', format: 'csv', confidence: 0.85,
        synonyms: ['tags', 'labels', 'categories', 'keywords'],
        transformHints: ['join_array_csv', 'split_csv_array'],
        notes: 'May be array or comma-separated string depending on connector',
      };
    }

    // ── File Content ──────────────────────────────────────────────────────
    if (/^(filecontent|data|attachment|binary|content|file)$/.test(key) && /file|attach/.test(label)) {
      return {
        role: 'file_content', format: 'base64', confidence: 0.75,
        synonyms: ['fileContent', 'data', 'attachment', 'binary'],
        transformHints: [],
        notes: '',
      };
    }

    // ── JSON Data ─────────────────────────────────────────────────────────
    if (fieldType === 'json' || fieldType === 'object') {
      return {
        role: 'json_data', format: 'json_string', confidence: 0.70,
        synonyms: ['metadata', 'properties', 'fieldsJson', 'customFields', 'data'],
        transformHints: ['json_stringify', 'json_parse'],
        notes: 'Arbitrary JSON — may need to be stringified or parsed depending on target',
      };
    }

    // ── Count / Number ────────────────────────────────────────────────────
    if (/^(count|quantity|limit|total|num|number|max|min)$/.test(key) && fieldType === 'number') {
      return {
        role: 'count_number', format: null, confidence: 0.72,
        synonyms: ['count', 'quantity', 'limit', 'total', 'num'],
        transformHints: [],
        notes: '',
      };
    }

    // ── No match ──────────────────────────────────────────────────────────
    return {
      role: null, format: null, confidence: 0,
      synonyms: [], transformHints: [],
      notes: 'Could not auto-detect role from field key/label — manual review recommended',
    };
  },
};
