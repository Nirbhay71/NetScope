import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/client";
import {
  getKpis,
  getCountryTraffic,
  getAsnTraffic,
  getEndpointTraffic,
  getAnomalies,
  getSuspiciousIps,
  getAsnThreatClusters,
} from "@/lib/snowflake/queries";

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  // Retrieval: pull live aggregates from Snowflake as grounding context
  const [kpis, countries, asns, endpoints, anomalies, suspiciousIps, asnThreats] =
    await Promise.all([
      getKpis(),
      getCountryTraffic(15),
      getAsnTraffic(15),
      getEndpointTraffic(15),
      getAnomalies(),
      getSuspiciousIps(15),
      getAsnThreatClusters(10),
    ]);

  const context = {
    overview: kpis,
    top_countries: countries,
    top_asns: asns,
    top_endpoints: endpoints,
    recent_anomalies: anomalies,
    suspicious_ips: suspiciousIps,
    asn_threat_clusters: asnThreats,
  };

  const isInvestigation = /why|flagged|investigat|explain|suspicious/i.test(
    question,
  );

  const prompt = `You are NetScope's traffic analyst and incident investigator. Answer the user's question about their web traffic using ONLY the JSON context below — never invent numbers not present in it. This is synthetic demo data. Reference specific numbers from the context, and mention the data is synthetic if the question implies real-world security decisions.

${
  isInvestigation
    ? `This looks like an incident-investigation question. Structure your answer as:
- **Evidence**: the specific numbers from the context that support or refute the alert
- **Likely explanation**: the most plausible cause given the pattern (e.g. bot ratio, ASN concentration, endpoint pattern)
- **Recommended next steps**: 2-3 concrete things to check next (e.g. rate-limit an ASN, review a specific endpoint, cross-check a country baseline)
Keep each section to 1-3 short bullet points.`
    : "Be concise: 2-5 sentences or a short list."
}

CONTEXT:
${JSON.stringify(context)}

QUESTION:
${question}`;

  try {
    const rows = await executeQuery<{ RESPONSE: string }>(
      "SELECT SNOWFLAKE.CORTEX.COMPLETE(?, ?) AS RESPONSE",
      ["llama3.1-70b", prompt],
    );
    return NextResponse.json({ answer: rows[0]?.RESPONSE ?? "" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reach Cortex",
      },
      { status: 500 },
    );
  }
}
