import { z } from "zod";

export const propertyEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("maintenance_request"),
    property_id: z.string().min(1),
    tenant_email: z.string().email(),
    summary: z.string().min(3).max(500),
    priority: z.enum(["routine", "urgent"]),
  }),
  z.object({
    kind: z.literal("tenant_document"),
    property_id: z.string().min(1),
    tenant_email: z.string().email(),
    document_name: z.string().min(1).max(120),
    expires_on: z.string().date(),
  }),
  z.object({
    kind: z.literal("inspection_reminder"),
    property_id: z.string().min(1),
    tenant_email: z.string().email(),
    inspection_on: z.string().date(),
  }),
]);

export type PropertyEvent = z.infer<typeof propertyEventSchema>;

export type NoticeDecision = {
  notify: boolean;
  subject?: string;
  text?: string;
};

export function decideNotice(event: PropertyEvent, today = new Date()): NoticeDecision {
  if (event.kind === "maintenance_request") {
    return event.priority === "urgent"
      ? {
          notify: true,
          subject: `Urgent maintenance at ${event.property_id}`,
          text: `${event.summary}\nTenant: ${event.tenant_email}`,
        }
      : { notify: false };
  }

  const target = new Date(
    event.kind === "tenant_document" ? event.expires_on : event.inspection_on,
  );
  const daysAway = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (daysAway < 0 || daysAway > 7) return { notify: false };

  return event.kind === "tenant_document"
    ? {
        notify: true,
        subject: `Tenant document due at ${event.property_id}`,
        text: `${event.document_name} expires on ${event.expires_on}.`,
      }
    : {
        notify: true,
        subject: `Inspection due at ${event.property_id}`,
        text: `Inspection is scheduled for ${event.inspection_on}.`,
      };
}
