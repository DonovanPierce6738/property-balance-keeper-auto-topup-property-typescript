import assert from "node:assert/strict";
import test from "node:test";
import { decideNotice } from "../src/property_workflow";

test("an inspection seven days away alerts the property team", () => {
  const decision = decideNotice(
    {
      kind: "inspection_reminder",
      property_id: "harbor-12",
      tenant_email: "tenant@example.com",
      inspection_on: "2026-10-07",
    },
    new Date("2026-09-30T00:00:00Z"),
  );

  assert.deepEqual(decision, {
    notify: true,
    subject: "Inspection due at harbor-12",
    text: "Inspection is scheduled for 2026-10-07.",
  });
});

test("routine maintenance stays queued without an email", () => {
  const decision = decideNotice({
    kind: "maintenance_request",
    property_id: "harbor-12",
    tenant_email: "tenant@example.com",
    summary: "Bedroom blind needs a new cord",
    priority: "routine",
  });

  assert.deepEqual(decision, { notify: false });
});
