import { executeQuery } from "./client";

export interface KpiRow {
  TOTAL_REQUESTS: number;
  UNIQUE_IPS: number;
  COUNTRIES: number;
  ERROR_RATE_PERCENT: number;
  AVG_LATENCY_MS: number;
  P95_LATENCY_MS: number;
  BOT_TRAFFIC_PERCENT: number;
  TOTAL_BYTES: number;
}

export async function getKpis(): Promise<KpiRow> {
  const rows = await executeQuery<KpiRow>(`
    SELECT
        COUNT(*) AS TOTAL_REQUESTS,
        COUNT(DISTINCT IP_ADDRESS) AS UNIQUE_IPS,
        COUNT(DISTINCT COUNTRY_CODE) AS COUNTRIES,
        ROUND(100.0 * COUNT_IF(STATUS_CODE >= 400) / NULLIF(COUNT(*), 0), 2) AS ERROR_RATE_PERCENT,
        ROUND(AVG(RESPONSE_TIME_MS), 2) AS AVG_LATENCY_MS,
        APPROX_PERCENTILE(RESPONSE_TIME_MS, 0.95) AS P95_LATENCY_MS,
        ROUND(100.0 * COUNT_IF(IS_BOT) / NULLIF(COUNT(*), 0), 2) AS BOT_TRAFFIC_PERCENT,
        SUM(BYTES_SENT) AS TOTAL_BYTES
    FROM NETSCOPE_DB.STAGING.ENRICHED_TRAFFIC
  `);
  return rows[0];
}

export interface CountryRow {
  COUNTRY_NAME: string;
  COUNTRY_CODE: string;
  TOTAL_REQUESTS: number;
  UNIQUE_IPS: number;
  ERROR_COUNT: number;
}

export async function getCountryTraffic(limit = 8): Promise<CountryRow[]> {
  return executeQuery<CountryRow>(`
    SELECT COUNTRY_NAME, COUNTRY_CODE, TOTAL_REQUESTS, UNIQUE_IPS, ERROR_COUNT
    FROM NETSCOPE_DB.ANALYTICS.V_COUNTRY_TRAFFIC
    WHERE COUNTRY_NAME IS NOT NULL AND COUNTRY_NAME != 'N/A'
    ORDER BY TOTAL_REQUESTS DESC
    LIMIT ${Number(limit)}
  `);
}

export interface AsnRow {
  ASN: string;
  ASN_NAME: string;
  TOTAL_REQUESTS: number;
  UNIQUE_IPS: number;
  AVG_LATENCY_MS: number;
}

export async function getAsnTraffic(limit = 8): Promise<AsnRow[]> {
  return executeQuery<AsnRow>(`
    SELECT ASN, ASN_NAME, COUNT(*) AS TOTAL_REQUESTS,
        COUNT(DISTINCT IP_ADDRESS) AS UNIQUE_IPS,
        ROUND(AVG(RESPONSE_TIME_MS), 2) AS AVG_LATENCY_MS
    FROM NETSCOPE_DB.STAGING.ENRICHED_TRAFFIC
    WHERE ASN IS NOT NULL AND ASN_NAME IS NOT NULL
    GROUP BY ASN, ASN_NAME
    ORDER BY TOTAL_REQUESTS DESC
    LIMIT ${Number(limit)}
  `);
}

export interface EndpointRow {
  ENDPOINT: string;
  TOTAL_REQUESTS: number;
  AVG_LATENCY_MS: number;
  P95_LATENCY_MS: number;
  ERROR_COUNT: number;
}

export async function getEndpointTraffic(limit = 10): Promise<EndpointRow[]> {
  return executeQuery<EndpointRow>(`
    SELECT ENDPOINT, COUNT(*) AS TOTAL_REQUESTS,
        ROUND(AVG(RESPONSE_TIME_MS), 2) AS AVG_LATENCY_MS,
        APPROX_PERCENTILE(RESPONSE_TIME_MS, 0.95) AS P95_LATENCY_MS,
        COUNT_IF(STATUS_CODE >= 400) AS ERROR_COUNT
    FROM NETSCOPE_DB.STAGING.ENRICHED_TRAFFIC
    GROUP BY ENDPOINT
    ORDER BY TOTAL_REQUESTS DESC
    LIMIT ${Number(limit)}
  `);
}

export interface HourlyRow {
  HOUR: string;
  TOTAL_REQUESTS: number;
  UNIQUE_IPS: number;
  ERROR_COUNT: number;
}

export async function getHourlyTrend(): Promise<HourlyRow[]> {
  return executeQuery<HourlyRow>(`
    SELECT
        TO_VARCHAR(DATE_TRUNC('HOUR', EVENT_TIME), 'YYYY-MM-DD"T"HH24:MI:SS') AS HOUR,
        COUNT(*) AS TOTAL_REQUESTS,
        COUNT(DISTINCT IP_ADDRESS) AS UNIQUE_IPS,
        COUNT_IF(STATUS_CODE >= 400) AS ERROR_COUNT
    FROM NETSCOPE_DB.STAGING.ENRICHED_TRAFFIC
    GROUP BY 1
    ORDER BY 1
  `);
}

export interface AnomalyRow {
  HOUR: string;
  COUNTRY_CODE: string;
  COUNTRY_NAME: string;
  REQUEST_COUNT: number;
  BASELINE_AVG: number;
  BASELINE_STDDEV: number;
}

export async function getAnomalies(): Promise<AnomalyRow[]> {
  return executeQuery<AnomalyRow>(`
    WITH HOURLY_COUNTRY_TRAFFIC AS (
        SELECT
            DATE_TRUNC('HOUR', EVENT_TIME) AS HOUR,
            COUNTRY_CODE,
            COUNTRY_NAME,
            COUNT(*) AS REQUEST_COUNT
        FROM NETSCOPE_DB.STAGING.ENRICHED_TRAFFIC
        GROUP BY HOUR, COUNTRY_CODE, COUNTRY_NAME
    ),
    BASELINE AS (
        SELECT
            HOUR, COUNTRY_CODE, COUNTRY_NAME, REQUEST_COUNT,
            AVG(REQUEST_COUNT) OVER (
                PARTITION BY COUNTRY_CODE ORDER BY HOUR
                ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
            ) AS BASELINE_AVG,
            STDDEV(REQUEST_COUNT) OVER (
                PARTITION BY COUNTRY_CODE ORDER BY HOUR
                ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
            ) AS BASELINE_STDDEV
        FROM HOURLY_COUNTRY_TRAFFIC
    )
    SELECT
        TO_VARCHAR(HOUR, 'YYYY-MM-DD"T"HH24:MI:SS') AS HOUR,
        COUNTRY_CODE, COUNTRY_NAME, REQUEST_COUNT,
        ROUND(BASELINE_AVG, 1) AS BASELINE_AVG,
        ROUND(BASELINE_STDDEV, 1) AS BASELINE_STDDEV
    FROM BASELINE
    WHERE BASELINE_AVG IS NOT NULL
      AND REQUEST_COUNT > BASELINE_AVG + 3 * BASELINE_STDDEV
    ORDER BY HOUR DESC
    LIMIT 20
  `);
}

export interface SuspiciousIpRow {
  IP_ADDRESS: string;
  COUNTRY_NAME: string;
  ASN_NAME: string;
  TOTAL_REQUESTS: number;
  BOT_REQUESTS: number;
  BOT_RATIO_PERCENT: number;
  DISTINCT_ENDPOINTS: number;
  ERROR_COUNT: number;
}

// flags IPs that look automated: high bot-ratio and/or narrow, repetitive
// hits against very few endpoints relative to their volume
export async function getSuspiciousIps(limit = 15): Promise<SuspiciousIpRow[]> {
  return executeQuery<SuspiciousIpRow>(`
    SELECT
        IP_ADDRESS,
        ANY_VALUE(COUNTRY_NAME) AS COUNTRY_NAME,
        ANY_VALUE(ASN_NAME) AS ASN_NAME,
        COUNT(*) AS TOTAL_REQUESTS,
        COUNT_IF(IS_BOT) AS BOT_REQUESTS,
        ROUND(100.0 * COUNT_IF(IS_BOT) / NULLIF(COUNT(*), 0), 1) AS BOT_RATIO_PERCENT,
        COUNT(DISTINCT ENDPOINT) AS DISTINCT_ENDPOINTS,
        COUNT_IF(STATUS_CODE >= 400) AS ERROR_COUNT
    FROM NETSCOPE_DB.STAGING.ENRICHED_TRAFFIC
    GROUP BY IP_ADDRESS
    HAVING COUNT(*) >= 5
    ORDER BY BOT_RATIO_PERCENT DESC, TOTAL_REQUESTS DESC
    LIMIT ${Number(limit)}
  `);
}

export interface AsnThreatRow {
  ASN: string;
  ASN_NAME: string;
  COUNTRY_NAME: string;
  FLAGGED_REQUESTS: number;
  TOTAL_REQUESTS: number;
  FLAGGED_SHARE_PERCENT: number;
  PERCENT_OF_ALL_FLAGGED: number;
}

// "flagged" = bot traffic OR a 4xx/5xx response — a simple stand-in for
// threat signal, grouped by network operator rather than individual IP
export async function getAsnThreatClusters(limit = 10): Promise<AsnThreatRow[]> {
  return executeQuery<AsnThreatRow>(`
    WITH FLAGGED AS (
        SELECT ASN, ANY_VALUE(ASN_NAME) AS ASN_NAME, ANY_VALUE(COUNTRY_NAME) AS COUNTRY_NAME,
            COUNT(*) AS TOTAL_REQUESTS,
            COUNT_IF(IS_BOT OR STATUS_CODE >= 400) AS FLAGGED_REQUESTS
        FROM NETSCOPE_DB.STAGING.ENRICHED_TRAFFIC
        GROUP BY ASN
    ),
    TOTAL_FLAGGED AS (
        SELECT SUM(FLAGGED_REQUESTS) AS GRAND_TOTAL FROM FLAGGED
    )
    SELECT
        F.ASN, F.ASN_NAME, F.COUNTRY_NAME, F.FLAGGED_REQUESTS, F.TOTAL_REQUESTS,
        ROUND(100.0 * F.FLAGGED_REQUESTS / NULLIF(F.TOTAL_REQUESTS, 0), 1) AS FLAGGED_SHARE_PERCENT,
        ROUND(100.0 * F.FLAGGED_REQUESTS / NULLIF(T.GRAND_TOTAL, 0), 1) AS PERCENT_OF_ALL_FLAGGED
    FROM FLAGGED F, TOTAL_FLAGGED T
    WHERE F.FLAGGED_REQUESTS > 0
    ORDER BY F.FLAGGED_REQUESTS DESC
    LIMIT ${Number(limit)}
  `);
}
