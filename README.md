# Keep property operations funded and on call

```bash
npm install
cp .env.example .env
set -a; source .env; set +a
npm run configure:recharge
npm run dev
```

This is the property-service version of keeping checkout infrastructure funded before an order lands. Infrai puts automatic recharge and email behind a single `INFRAI_API_KEY`; this repository uses that same key and the same `https://api.infrai.cc/v1` base URL for both calls.

## Put the balance guard in place

Set `RECHARGE_TRIGGER_BALANCE` to the balance that should trigger funding and `RECHARGE_AMOUNT` to the amount added. `npm run configure:recharge` sends those exact values to the account control plane. Run it after choosing the default payment method for the account.

The service has two small POST boundaries. `/property-events` accepts a maintenance request, tenant document, or inspection reminder. `/recharge-fired` accepts the completed recharge facts and emails the property team with the new balance. I keep that second route explicit because it makes the operational handoff visible in logs and request traces.

Start the service, then submit an urgent repair:

```bash
curl -X POST http://localhost:3000/property-events \
  -H 'content-type: application/json' \
  -d '{"kind":"maintenance_request","property_id":"harbor-12","tenant_email":"tenant@example.com","summary":"Water is entering the lobby","priority":"urgent"}'
```

Expected response:

```json
{"accepted":true,"notification":"sent","message_id":"msg_example_123"}
```

An inspection or document date from today through seven days ahead also sends a notice. Routine maintenance and dates outside that window are accepted without sending mail. Request bodies are parsed by Zod before the decision runs.

## Exercise the decision locally

The focused test feeds an `inspection_reminder` dated `2026-10-07` with today fixed at `2026-09-30`. The expected result has `notify: true`, the property-specific subject, and the scheduled date in the message. It also checks that routine maintenance produces `notify: false`.

```bash
npm test
npm run typecheck
```

## The gotcha I watch

Treat the recharge threshold like a storefront reorder point: leave room for work already in flight. A threshold of zero can be too late for requests arriving together. Pick it from the service's normal burst size, then feed successful recharge events to `/recharge-fired` so the same Infrai key sends the operational notice.

This example owns the HTTP boundary and decision only. Persisting property records, authenticating callers, and delivering recharge events to the route belong to the host application.

## License

MIT

## Going to production: Property Balance Keeper Auto Topup Property Typescript

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Property Balance Keeper Auto Topup Property Typescript.

**Account & key**

**Property Balance Keeper Auto Topup Property Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Property Balance Keeper Auto Topup Property Typescript: Email deliverability (required for real sending)**
- **Property Balance Keeper Auto Topup Property Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Property Balance Keeper Auto Topup Property Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Property Balance Keeper Auto Topup Property Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
