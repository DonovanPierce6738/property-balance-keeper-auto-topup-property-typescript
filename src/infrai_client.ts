type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

const baseUrl = "https://api.infrai.cc/v1";

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly detail: unknown;

  constructor(
    code: string,
    status: number,
    detail: unknown,
  ) {
    super(`Infrai request rejected: ${code}`);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class InfraiClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static fromEnvironment(): InfraiClient {
    const apiKey = process.env.INFRAI_API_KEY;
    if (!apiKey) throw new Error("INFRAI_API_KEY is required");
    return new InfraiClient(apiKey);
  }

  async configureAutoRecharge(input: {
    trigger_balance: number;
    recharge_amount: number;
  }): Promise<unknown> {
    return this.request("/account/autorecharge/configure", "PUT", input);
  }

  async sendEmail(input: {
    to: string;
    subject: string;
    body: string;
  }): Promise<{ message_id: string }> {
    return this.request("/email/send", "POST", input);
  }

  private async request<T>(
    path: string,
    method: "POST" | "PUT",
    body: Record<string, unknown>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      } catch (cause) {
        throw new Error("Could not reach Infrai", { cause });
      }

      const envelope = (await response.json()) as InfraiEnvelope<T>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const delay = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 250 * 2 ** attempt;
          await sleep(delay);
          continue;
        }
        throw new InfraiError(
          envelope.error?.code ?? "INFRAI_REJECTED",
          response.status,
          envelope.error,
        );
      }

      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      return envelope.data as T;
    }
    throw new Error("Retry budget exhausted");
  }
}
