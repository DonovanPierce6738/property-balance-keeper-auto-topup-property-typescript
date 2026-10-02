import { createServer, type ServerResponse } from "node:http";
import { z } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client";
import { decideNotice, propertyEventSchema } from "./property_workflow";

const rechargeEventSchema = z.object({
  recharge_amount: z.number().positive(),
  balance_after: z.number().nonnegative(),
});

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: AsyncIterable<Buffer>): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const client = InfraiClient.fromEnvironment();
const teamEmail = process.env.PROPERTY_TEAM_EMAIL;
if (!teamEmail) throw new Error("PROPERTY_TEAM_EMAIL is required");

const server = createServer(async (request, response) => {
  if (request.method !== "POST") {
    json(response, 404, { error: "route_not_found" });
    return;
  }

  try {
    if (request.url === "/property-events") {
      const event = propertyEventSchema.parse(await readJson(request));
      const decision = decideNotice(event);
      if (!decision.notify) {
        json(response, 202, { accepted: true, notification: "not_required" });
        return;
      }
      const sent = await client.sendEmail({
        to: teamEmail,
        subject: decision.subject!,
        body: decision.text!,
      });
      json(response, 202, { accepted: true, notification: "sent", message_id: sent.message_id });
      return;
    }

    if (request.url === "/recharge-fired") {
      const event = rechargeEventSchema.parse(await readJson(request));
      const sent = await client.sendEmail({
        to: teamEmail,
        subject: "Property service balance recharged",
        body: `Recharged ${event.recharge_amount}; current balance is ${event.balance_after}.`,
      });
      json(response, 202, { accepted: true, notification: "sent", message_id: sent.message_id });
      return;
    }

    json(response, 404, { error: "route_not_found" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      json(response, 400, { error: "invalid_request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      json(response, status, { error: error.code });
      return;
    }
    json(response, 500, { error: "service_error" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Property service listening on http://localhost:${port}`));
