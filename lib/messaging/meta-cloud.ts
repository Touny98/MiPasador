export interface InteractiveButton {
  id: string;
  title: string;
}

export interface ListItem {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title?: string;
  rows: ListItem[];
}

export class MetaCloudProvider {
  private accessToken: string;
  private phoneNumberId: string;
  private readonly apiVersion = 'v21.0';
  private readonly baseUrl: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  async sendMessage(to: string, message: string): Promise<void> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };
    const options: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    };
    await this.fetchWithRetry(url, options);
  }

  async sendInteractiveButtons(
    to: string,
    body: string,
    buttons: InteractiveButton[],
    header?: string,
    footer?: string
  ): Promise<void> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    const interactive: Record<string, unknown> = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
      },
    };
    if (header) interactive.header = { type: 'text', text: header };
    if (footer) interactive.footer = { text: footer };

    const msgBody = { messaging_product: 'whatsapp', to, type: 'interactive', interactive };
    await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(msgBody),
    });
  }

  async sendList(
    to: string,
    body: string,
    buttonLabel: string,
    sections: ListSection[],
    header?: string,
    footer?: string
  ): Promise<void> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    const interactive: Record<string, unknown> = {
      type: 'list',
      body: { text: body },
      action: { button: buttonLabel, sections },
    };
    if (header) interactive.header = { type: 'text', text: header };
    if (footer) interactive.footer = { text: footer };

    const msgBody = { messaging_product: 'whatsapp', to, type: 'interactive', interactive };
    await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(msgBody),
    });
  }

  async getMediaInfo(mediaId: string): Promise<{ url: string; mimeType: string }> {
    const url = `${this.baseUrl}/${mediaId}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const data = await response.json() as { url: string; mime_type?: string };
    return { url: data.url, mimeType: data.mime_type || 'image/jpeg' };
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    const { url } = await this.getMediaInfo(mediaId);
    return url;
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to download media: HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 100 ms, 200 ms, 400 ms
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt - 1)));
      }

      try {
        const response = await fetch(url, options);

        if (response.ok) return response;

        // 4xx (except 429 rate-limit): client error, retrying won't help
        if (response.status < 500 && response.status !== 429) {
          const body = await response.text().catch(() => '(unreadable)');
          throw new Error(`Non-retryable HTTP ${response.status}: ${body}`);
        }

        // 5xx or 429: transient, will retry
        lastError = new Error(`HTTP ${response.status}`);
      } catch (err) {
        if ((err as Error).message.startsWith('Non-retryable')) throw err;
        lastError = err as Error;
      }
    }

    throw lastError;
  }
}
