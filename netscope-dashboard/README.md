# NetScope dashboard

Next.js (App Router) frontend for NetScope. See the [project README](../README.md)
for the full architecture and Snowflake setup — this file covers just this app.

## Run locally

```bash
npm install
cp .env.local.example .env.local   # fill in your Snowflake account/user/password
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` — Overview: KPIs, hourly traffic trend
- `/traffic` — world map, top countries/ASNs/endpoints
- `/security` — suspicious IPs, ASN threat clustering
- `/anomalies` — 3σ traffic-spike detection, with "Investigate" → Ask NetScope
- `/ask` — natural-language Q&A over live Snowflake data via
  `SNOWFLAKE.CORTEX.COMPLETE` (no external LLM API key needed)

## Key files

- `src/lib/snowflake/client.ts` — connection singleton + query executor
- `src/lib/snowflake/queries.ts` — all SQL used by the dashboard
- `src/app/api/ask/route.ts` — retrieval (Snowflake aggregates) + Cortex call
