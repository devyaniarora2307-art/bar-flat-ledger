# Bangalore Flat Ledger — automated

Scrapes 4 Bangalore flat-hunting Facebook groups every morning, merges new posts
into a running dataset (no duplicates, no re-scraping old posts), and publishes
a filterable, shareable page via GitHub Pages.

## One-time setup (~10 minutes)

1. **Create a GitHub account** if you don't have one: github.com/join

2. **Create a new repository**
   - Go to github.com/new
   - Name it anything, e.g. `blr-flat-ledger`
   - Set it to **Public** (required for free GitHub Pages)
   - Don't initialize with a README (we already have one)

3. **Upload these files** to the repo. Easiest way: on the repo page, click
   "Add file" → "Upload files", drag in everything from this folder
   (including the hidden `.github` folder — if your drag-and-drop tool hides
   dotfiles, use `git` from a terminal instead, see below), then commit.

   Terminal alternative (recommended — handles the `.github` folder correctly):
   ```
   cd blr-flat-ledger
   git init
   git add .
   git commit -m "Initial setup"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

4. **Add your Apify token as a secret**
   - In your repo: Settings → Secrets and variables → Actions → New repository secret
   - Name: `APIFY_TOKEN`
   - Value: your Apify API token (Apify Console → Settings → Integrations → API token)

5. **Turn on GitHub Pages**
   - Settings → Pages
   - Under "Build and deployment", set Source to **GitHub Actions**

6. **Run it once manually** to confirm it works
   - Go to the Actions tab → "Daily flat-ledger update" → Run workflow
   - Wait ~1-2 minutes, check it goes green
   - Your live link will be: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

After that, it runs automatically every morning at 7:00 AM IST (edit the cron
line in `.github/workflows/daily-update.yml` if you want a different time —
the two numbers are `minute hour` in UTC, so 7:00 AM IST = `30 1`).

## How the credit-saving works

Each run only asks Apify for posts newer than `LOOKBACK` (default 2 days —
wider than the 1-day schedule so a missed run never loses a post). Old posts
are never re-scraped. Steady-state daily cost across 4 groups should be a few
cents, not the ~$1-1.50 a full fresh scrape costs.

## Files

- `merge_and_build.py` — the daily pipeline (scrape → parse → merge → build)
- `extractor.py` — the area/BHK/rent/gender/move-in parsing logic
- `template.html` / `app.js` — the page shell and filtering logic
- `data.json` — the accumulated dataset (grows daily, never shrinks)
- `index.html` — the built page (regenerated every run, this is what Pages serves)
- `.github/workflows/daily-update.yml` — the schedule + automation

## If something breaks

- Actions tab → click the failed run → read the red step's log
- Most common cause: Apify token missing/expired, or the actor's sync-run
  timeout (300s) being too short if a group has a lot of new posts — in that
  case lower `RESULTS_LIMIT` or shorten `LOOKBACK` as repo variables/secrets.
