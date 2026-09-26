"""Synthetic web traffic generator for NetScope.

Generates request-level traffic events with repeated IPs, multiple
endpoints/status codes, a multi-day time window, and injected anomaly
windows (traffic spikes, brute-force bursts, scanning behavior).
"""
import argparse
import csv
import json
import os
import random
import uuid
from datetime import datetime, timedelta

ENDPOINTS = [
    ("/api/login", "POST"),
    ("/api/logout", "POST"),
    ("/api/users", "GET"),
    ("/api/users/{id}", "GET"),
    ("/api/orders", "GET"),
    ("/api/orders", "POST"),
    ("/api/orders/{id}", "GET"),
    ("/api/products", "GET"),
    ("/api/products/{id}", "GET"),
    ("/api/search", "GET"),
    ("/api/cart", "GET"),
    ("/api/cart", "POST"),
    ("/api/checkout", "POST"),
    ("/api/profile", "GET"),
    ("/api/profile", "PUT"),
    ("/static/assets/app.js", "GET"),
    ("/health", "GET"),
    ("/admin/dashboard", "GET"),
    ("/admin/config", "POST"),
]

STATUS_WEIGHTS = [
    (200, 0.78), (201, 0.04), (301, 0.02), (400, 0.04),
    (401, 0.03), (403, 0.02), (404, 0.03), (429, 0.01),
    (500, 0.02), (503, 0.01),
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/605.1",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/129.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
    "PostmanRuntime/7.36",
    "curl/8.4.0",
    "python-requests/2.31.0",
]

BOT_USER_AGENTS = [
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "python-requests/2.31.0",
    "curl/8.4.0",
    "Scrapy/2.11 (+https://scrapy.org)",
]

REFERRERS = [
    "https://www.google.com/",
    "https://www.bing.com/",
    "https://duckduckgo.com/",
    "https://www.facebook.com/",
    "https://twitter.com/",
    "https://t.co/",
    "direct",
    "https://mail.google.com/",
    "https://news.ycombinator.com/",
]

TRAFFIC_SOURCES = ["organic", "paid", "direct", "referral", "social", "email", "bot"]

ANOMALY_TYPES = [
    "traffic_spike",
    "brute_force",
    "port_scan_like",
    "error_storm",
]


def format_ntz9(ts, rng):
    """Format a datetime for Snowflake TIMESTAMP_NTZ(9): 9 fractional-second digits."""
    nanos = f"{rng.randint(0, 999):03d}"  # sub-microsecond digits (synthetic)
    return f"{ts.strftime('%Y-%m-%d %H:%M:%S')}.{ts.microsecond:06d}{nanos}"


def weighted_choice(pairs, rng):
    r = rng.random()
    acc = 0.0
    for value, weight in pairs:
        acc += weight
        if r <= acc:
            return value
    return pairs[-1][0]


def random_public_ip(rng):
    while True:
        a = rng.randint(1, 223)
        if a in (10, 127) or a >= 224:
            continue
        b, c, d = rng.randint(0, 255), rng.randint(0, 255), rng.randint(1, 254)
        if a == 172 and 16 <= b <= 31:
            continue
        if a == 192 and b == 168:
            continue
        return f"{a}.{b}.{c}.{d}"


COUNTRIES = {
    "US": ("United States", "NA", "North America"),
    "CA": ("Canada", "NA", "North America"),
    "GB": ("United Kingdom", "EU", "Europe"),
    "DE": ("Germany", "EU", "Europe"),
    "FR": ("France", "EU", "Europe"),
    "IN": ("India", "AS", "Asia"),
    "JP": ("Japan", "AS", "Asia"),
    "AU": ("Australia", "OC", "Oceania"),
    "RU": ("Russia", "EU", "Europe"),
    "CN": ("China", "AS", "Asia"),
    "BR": ("Brazil", "SA", "South America"),
    "VN": ("Vietnam", "AS", "Asia"),
    "IR": ("Iran", "AS", "Asia"),
}

ASNS = [
    ("AS15169", "Google LLC", "google.com"),
    ("AS16509", "Amazon.com, Inc.", "amazon.com"),
    ("AS8075", "Microsoft Corporation", "microsoft.com"),
    ("AS13335", "Cloudflare, Inc.", "cloudflare.com"),
    ("AS32934", "Meta Platforms, Inc.", "meta.com"),
    ("AS20940", "Akamai Technologies", "akamai.com"),
    ("AS14061", "DigitalOcean, LLC", "digitalocean.com"),
    ("AS16276", "OVH SAS", "ovhcloud.com"),
    ("AS24940", "Hetzner Online GmbH", "hetzner.com"),
    ("AS9009", "M247 Ltd", "m247.com"),
    ("AS4134", "China Telecom", "chinatelecom.com.cn"),
    ("AS12389", "Rostelecom", "rt.ru"),
]


def build_ip_pool(rng, size=500):
    pool = []
    n_internal = int(size * 0.1)
    n_malicious = int(size * 0.05)
    for _ in range(n_internal):
        ip = f"10.0.{rng.randint(0,255)}.{rng.randint(1,254)}"
        pool.append({
            "ip": ip, "category": "internal",
            "country_code": "ZZ", "country_name": "N/A",
            "continent_code": "ZZ", "continent_name": "N/A",
            "asn": "AS-INTERNAL", "asn_name": "Internal Network", "asn_domain": "internal.local",
        })
    for _ in range(n_malicious):
        ip = random_public_ip(rng)
        code = rng.choice(["RU", "CN", "BR", "VN", "IR"])
        name, ccode, cname = COUNTRIES[code]
        asn, asn_name, asn_domain = rng.choice(ASNS)
        pool.append({
            "ip": ip, "category": "malicious",
            "country_code": code, "country_name": name,
            "continent_code": ccode, "continent_name": cname,
            "asn": asn, "asn_name": asn_name, "asn_domain": asn_domain,
        })
    while len(pool) < size:
        ip = random_public_ip(rng)
        code = rng.choice(["US", "GB", "DE", "IN", "FR", "JP", "CA", "AU"])
        name, ccode, cname = COUNTRIES[code]
        asn, asn_name, asn_domain = rng.choice(ASNS)
        pool.append({
            "ip": ip, "category": "external",
            "country_code": code, "country_name": name,
            "continent_code": ccode, "continent_name": cname,
            "asn": asn, "asn_name": asn_name, "asn_domain": asn_domain,
        })
    rng.shuffle(pool)
    return pool


def plan_anomaly_windows(start_time, days, rng, n_windows=None):
    total_seconds = days * 86400
    if n_windows is None:
        n_windows = max(2, days)
    windows = []
    for i in range(n_windows):
        offset = rng.uniform(0, total_seconds - 3600)
        duration_min = rng.choice([10, 15, 30, 45, 60])
        w_start = start_time + timedelta(seconds=offset)
        w_end = w_start + timedelta(minutes=duration_min)
        anomaly_type = rng.choice(ANOMALY_TYPES)
        windows.append({
            "anomaly_id": f"ANOM-{i+1:04d}",
            "start_time": w_start,
            "end_time": w_end,
            "anomaly_type": anomaly_type,
        })
    windows.sort(key=lambda w: w["start_time"])
    return windows


def window_active(windows, ts):
    for w in windows:
        if w["start_time"] <= ts <= w["end_time"]:
            return w
    return None


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic NetScope traffic data")
    parser.add_argument("--events", type=int, default=100000)
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--chunk-size", type=int, default=50000)
    parser.add_argument("--out-dir", type=str, default=os.path.join("data", "output"))
    args = parser.parse_args()

    rng = random.Random(args.seed)
    os.makedirs(args.out_dir, exist_ok=True)

    start_time = datetime(2025, 1, 1, 0, 0, 0)
    ip_pool = build_ip_pool(rng, size=max(100, args.events // 200))
    anomaly_windows = plan_anomaly_windows(start_time, args.days, rng)
    malicious_ips = [p["ip"] for p in ip_pool if p["category"] == "malicious"]
    normal_ips = [p["ip"] for p in ip_pool if p["category"] != "malicious"]

    ip_weights = [rng.uniform(0.2, 5.0) for _ in ip_pool]
    ip_list = [p["ip"] for p in ip_pool]

    traffic_path = os.path.join(args.out_dir, "traffic_events.csv")
    # first 14 columns match NETSCOPE_DB.RAW.RAW_TRAFFIC's column order exactly,
    # since COPY INTO maps CSV fields positionally; extras trail at the end.
    fieldnames = [
        "event_id", "event_time", "ip_address", "endpoint", "http_method",
        "status_code", "response_time_ms", "bytes_sent",
        "user_agent", "request_id", "session_id", "referrer", "is_bot",
        "traffic_source", "bytes_received", "is_anomaly", "anomaly_type",
    ]

    # keep a rolling session id per ip so repeated requests from the same
    # ip within a short span share a session
    ip_sessions = {}

    def session_for(ip, ts, rng):
        entry = ip_sessions.get(ip)
        if entry is None or (ts - entry["last_seen"]).total_seconds() > 1800:
            entry = {"session_id": str(uuid.UUID(int=rng.getrandbits(128))), "last_seen": ts}
            ip_sessions[ip] = entry
        else:
            entry["last_seen"] = ts
        return entry["session_id"]

    total_seconds = args.days * 86400
    status_count = {}
    anomaly_event_count = 0
    endpoint_count = {}

    with open(traffic_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        buffer = []
        for i in range(args.events):
            base_ts = start_time + timedelta(seconds=rng.uniform(0, total_seconds))
            active_window = window_active(anomaly_windows, base_ts)

            if active_window and rng.random() < 0.85:
                is_anomaly = True
                a_type = active_window["anomaly_type"]
                if a_type == "brute_force":
                    src_ip = rng.choice(malicious_ips) if malicious_ips else rng.choice(ip_list)
                    endpoint, method = "/api/login", "POST"
                    status_code = weighted_choice([(401, 0.85), (200, 0.1), (429, 0.05)], rng)
                    resp_time = rng.uniform(5, 60)
                elif a_type == "port_scan_like":
                    src_ip = rng.choice(malicious_ips) if malicious_ips else rng.choice(ip_list)
                    endpoint, method = rng.choice(ENDPOINTS)
                    status_code = weighted_choice([(404, 0.7), (403, 0.2), (200, 0.1)], rng)
                    resp_time = rng.uniform(1, 20)
                elif a_type == "error_storm":
                    src_ip = rng.choice(ip_list)
                    endpoint, method = rng.choice(ENDPOINTS)
                    status_code = weighted_choice([(500, 0.6), (503, 0.3), (200, 0.1)], rng)
                    resp_time = rng.uniform(200, 2000)
                else:  # traffic_spike
                    src_ip = rng.choice(ip_list)
                    endpoint, method = rng.choice(ENDPOINTS)
                    status_code = weighted_choice(STATUS_WEIGHTS, rng)
                    resp_time = rng.uniform(50, 500)
                anomaly_event_count += 1
            else:
                is_anomaly = False
                a_type = ""
                src_ip = rng.choices(ip_list, weights=ip_weights, k=1)[0]
                endpoint, method = rng.choice(ENDPOINTS)
                status_code = weighted_choice(STATUS_WEIGHTS, rng)
                resp_time = max(1.0, rng.gauss(120, 60))

            status_count[status_code] = status_count.get(status_code, 0) + 1
            endpoint_count[endpoint] = endpoint_count.get(endpoint, 0) + 1

            is_bot = is_anomaly and a_type in ("port_scan_like", "brute_force") or rng.random() < 0.05
            user_agent = rng.choice(BOT_USER_AGENTS) if is_bot else rng.choice(USER_AGENTS)
            referrer = "direct" if is_bot else rng.choice(REFERRERS)
            traffic_source = "bot" if is_bot else rng.choice(TRAFFIC_SOURCES[:-1])

            row = {
                "event_id": str(uuid.UUID(int=rng.getrandbits(128))),
                "event_time": format_ntz9(base_ts, rng),
                "ip_address": src_ip,
                "endpoint": endpoint,
                "http_method": method,
                "status_code": status_code,
                "response_time_ms": round(resp_time, 2),
                "bytes_sent": rng.randint(100, 2000),
                "bytes_received": rng.randint(200, 50000),
                "user_agent": user_agent,
                "request_id": str(uuid.UUID(int=rng.getrandbits(128))),
                "session_id": session_for(src_ip, base_ts, rng),
                "referrer": referrer,
                "is_bot": is_bot,
                "traffic_source": traffic_source,
                "is_anomaly": is_anomaly,
                "anomaly_type": a_type,
            }
            buffer.append(row)
            if len(buffer) >= args.chunk_size:
                writer.writerows(buffer)
                buffer.clear()
        if buffer:
            writer.writerows(buffer)

    ip_pool_path = os.path.join(args.out_dir, "ip_pool.csv")
    ip_pool_fieldnames = [
        "ip_address", "country_code", "country_name",
        "continent_code", "continent_name", "asn", "asn_name", "asn_domain",
    ]
    with open(ip_pool_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=ip_pool_fieldnames)
        writer.writeheader()
        for p in ip_pool:
            writer.writerow({
                "ip_address": p["ip"],
                "country_code": p["country_code"],
                "country_name": p["country_name"],
                "continent_code": p["continent_code"],
                "continent_name": p["continent_name"],
                "asn": p["asn"],
                "asn_name": p["asn_name"],
                "asn_domain": p["asn_domain"],
            })

    anomalies_path = os.path.join(args.out_dir, "ground_truth_anomalies.csv")
    with open(anomalies_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "anomaly_id", "start_time", "end_time", "anomaly_type",
        ])
        writer.writeheader()
        for w in anomaly_windows:
            writer.writerow({
                "anomaly_id": w["anomaly_id"],
                "start_time": w["start_time"].isoformat(),
                "end_time": w["end_time"].isoformat(),
                "anomaly_type": w["anomaly_type"],
            })

    summary = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "seed": args.seed,
        "total_events": args.events,
        "days": args.days,
        "time_range": {
            "start": start_time.isoformat(),
            "end": (start_time + timedelta(seconds=total_seconds)).isoformat(),
        },
        "ip_pool_size": len(ip_pool),
        "anomaly_windows": len(anomaly_windows),
        "anomaly_events": anomaly_event_count,
        "anomaly_rate": round(anomaly_event_count / args.events, 5) if args.events else 0,
        "status_code_distribution": {str(k): v for k, v in sorted(status_count.items())},
        "endpoint_distribution": dict(sorted(endpoint_count.items(), key=lambda kv: -kv[1])),
        "output_files": {
            "traffic_events": traffic_path,
            "ip_pool": ip_pool_path,
            "ground_truth_anomalies": anomalies_path,
        },
    }
    summary_path = os.path.join(args.out_dir, "generation_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Generated {args.events} events over {args.days} days (seed={args.seed})")
    print(f"  -> {traffic_path}")
    print(f"  -> {ip_pool_path}")
    print(f"  -> {anomalies_path}")
    print(f"  -> {summary_path}")


if __name__ == "__main__":
    main()
