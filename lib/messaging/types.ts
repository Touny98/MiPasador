// Types for WhatsApp webhook payload based on Meta documentation
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

export interface WhatsAppWebhookEntry {
  id: string; // WHATSAPP_BUSINESS_ACCOUNT_ID
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: 'messages';
}

export interface WhatsAppWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  // Other fields like contacts, etc. can be added if needed
}

export interface WhatsAppMessage {
  from: string; // Sender's phone number
  id: string; // Message ID (wamid...)
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'reaction';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string; };
    list_reply?: { id: string; title: string; description?: string; };
  };
}

export interface WhatsAppStatus {
  id: string; // Message ID
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  // Optional: errors, pricing, etc.
}

// Type for the raw body (string) used for HMAC verification
export type WebhookRawBody = string;

// Type for idempotency key (using message ID)
export type MessageIdMeta = string;