export class MetaCloudProvider {
  private accessToken: string;
  private phoneNumberId: string;
  private readonly apiVersion = 'v18.0';
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
          throw new Error(`Non-retryable HTTP ${response.status}`);
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
