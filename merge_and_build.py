"""
Daily pipeline, run by GitHub Actions every morning:
1. Calls Apify (sync endpoint) for each tracked group, asking only for posts
   newer than N days -> keeps Apify credit usage tiny on steady-state days.
2. Parses new posts with extractor.py
3. Merges into data.json (dedup by postLink, so re-running never duplicates)
4. Rebuilds index.html from template.html + app.js + data.json

Env vars required:
  APIFY_TOKEN   - your Apify API token (set as a GitHub Actions secret)
Optional:
  LOOKBACK      - e.g. "2 days" (default). Slightly wider than the schedule
                  interval so a missed run doesn't lose posts.
  RESULTS_LIMIT - safety cap per group per run (default 150)
"""
import json
import os
import sys
import time
import requests

from extractor import parse_post

APIFY_TOKEN = os.environ.get("APIFY_TOKEN")
if not APIFY_TOKEN:
    sys.exit("ERROR: APIFY_TOKEN environment variable is not set.")

LOOKBACK = os.environ.get("LOOKBACK", "2 days")
RESULTS_LIMIT = int(os.environ.get("RESULTS_LIMIT", "150"))

GROUP_URLS = [
    "https://www.facebook.com/groups/117112802199699",
    "https://www.facebook.com/groups/838402552906457/",
    "https://www.facebook.com/groups/876779221120021",
    "https://www.facebook.com/groups/427162957648685",
]

ACTOR = "apify~facebook-groups-scraper"
SYNC_ENDPOINT = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items"

DATA_FILE = "data.json"
TEMPLATE_FILE = "template.html"
SCRIPT_FILE = "app.js"
OUTPUT_FILE = "index.html"


def fetch_new_posts():
    """Runs the actor synchronously and returns raw dataset items."""
    payload = {
        "startUrls": [{"url": u} for u in GROUP_URLS],
        "resultsLimit": RESULTS_LIMIT,
        "viewOption": "CHRONOLOGICAL",
        "onlyPostsNewerThan": LOOKBACK,
    }
    print(f"Calling Apify actor {ACTOR} | lookback={LOOKBACK} | limit={RESULTS_LIMIT}")
    resp = requests.post(
        SYNC_ENDPOINT,
        params={"token": APIFY_TOKEN, "timeout": 300},
        json=payload,
        timeout=330,
    )
    resp.raise_for_status()
    items = resp.json()
    print(f"Apify returned {len(items)} raw items")
    return items


def load_existing():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE) as f:
            return json.load(f)
    return []


def merge(existing, new_rows):
    by_link = {r["postLink"]: r for r in existing if r.get("postLink")}
    added = 0
    for r in new_rows:
        if not r or not r.get("postLink"):
            continue
        if r["postLink"] not in by_link:
            added += 1
        by_link[r["postLink"]] = r  # newer parse wins if re-scraped
    merged = list(by_link.values())
    merged.sort(key=lambda r: r.get("postedAt") or "", reverse=True)
    print(f"Merged: {len(existing)} existing + {added} new = {len(merged)} total")
    return merged


def build_html(rows):
    with open(TEMPLATE_FILE) as f:
        html = f.read()
    with open(SCRIPT_FILE) as f:
        script = f.read()
    html = html.replace("__DATA__", json.dumps(rows))
    html = html.replace("__SCRIPT__", script)
    html = html.replace("__SCRAPE_DATE__", time.strftime("%d %b %Y"))
    with open(OUTPUT_FILE, "w") as f:
        f.write(html)
    print(f"Wrote {OUTPUT_FILE} ({len(html)} bytes, {len(rows)} posts)")


def main():
    raw_items = fetch_new_posts()
    parsed = [parse_post(d) for d in raw_items]
    parsed = [p for p in parsed if p]

    existing = load_existing()
    merged = merge(existing, parsed)

    with open(DATA_FILE, "w") as f:
        json.dump(merged, f)

    build_html(merged)


if __name__ == "__main__":
    main()
