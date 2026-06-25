export class ResendClient {
  constructor(
    private apiKey: string,
    private fromEmail: string,
  ) {}

  async send(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API failed (${res.status}): ${body.slice(0, 300)}`);
    }
  }
}
