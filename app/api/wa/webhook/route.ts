import { NextRequest, NextResponse, after } from 'next/server';
import { verifyWebhookSignature } from '@/lib/utils/webhookVerification';
import { saveIncomingMessage } from '@/lib/services/messageService';
import { handleIncomingMessage } from '@/lib/bot/dispatcher';
import { WhatsAppWebhookPayload, MessageIdMeta } from '@/lib/messaging/types';

// GET handler for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge ?? '', { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// POST handler for receiving webhook events
export async function POST(request: NextRequest) {
  // Get raw body for HMAC verification
  const rawBody = await request.text();

  // Get signature from headers
  const signature = request.headers.get('x-hub-signature-256');

  // Verify HMAC-SHA256 signature
  const appSecret = process.env.APP_SECRET;
  if (!appSecret || !signature || !verifyWebhookSignature(rawBody, signature, appSecret)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Parse JSON body
  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error('Failed to parse webhook payload:', error);
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  // Respond 200 immediately — Meta requires acknowledgement before doing any work
  after(async () => {
    const processedMessageIds: Set<string> = new Set();

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { value } = change;
        const phoneNumberId = value.metadata?.phone_number_id;

        if (value.messages) {
          for (const message of value.messages) {
            const msgIdMeta: MessageIdMeta = message.id;

            if (processedMessageIds.has(msgIdMeta)) continue;
            processedMessageIds.add(msgIdMeta);

            const saveResult = await saveIncomingMessage(message, phoneNumberId).catch(err => {
              console.error('Failed to save incoming message:', err);
              return null;
            });

            if (message.type === 'text' && message.text?.body && saveResult) {
              const { merchantId, conversationId } = saveResult;
              try {
                await handleIncomingMessage(message.from, message.text.body, merchantId ?? '', conversationId ?? '');
              } catch (err) {
                console.error('Failed to handle incoming message:', err);
              }
            }
          }
        }
      }
    }
  });

  return new NextResponse('OK', { status: 200 });
}