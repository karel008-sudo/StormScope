# StormScope ČHMÚ poller

A Node.js script that runs in **GitHub Actions** every 10 minutes:

1. Lists the latest 144 PNG snapshots from the ČHMÚ pseudoCAPPI2km radar feed
2. Downloads only the new ones (dedup by filename, kept in `chmi-data` branch)
3. Pulls the latest forecast TAR (`fct_pseudoCAPPI2km`, +10..+60 min in 10-min steps)
4. Processes each PNG: cuts the top label band, makes white pixels fully transparent
5. Writes the processed PNGs into `frames/<sha8>.png`
6. Builds an `index.json` with frame metadata (time, type, jsDelivr URL)
7. Force-pushes the result as a single orphan commit to the `chmi-data` branch

The frontend then reads the index via the GitHub API (CORS-friendly) and the PNG
frames via [jsDelivr](https://www.jsdelivr.com/) (CORS-friendly, edge-cached).
There is no backend service to run, no account to create, no secrets needed —
only the workflow's auto-injected `GITHUB_TOKEN`.

## Local development

```bash
cd chmi-poller
npm install
node poll.mjs --out /tmp/chmi-out --pages "https://karel008-sudo.github.io/StormScope/"
```

This dry-runs the pipeline into `/tmp/chmi-out/` without git-pushing anything.

## Limits & honesty

- **Cron lag:** GitHub Actions schedule events run with median ~5 min lag,
  occasionally up to ~30 min during peak load. ČHMÚ updates every 5 min. Net
  effect: data is between 5 and 30 min stale on the frontend in steady state.
- **Polite to ČHMÚ:** dedup-by-filename means we re-download only ~2-3 PNGs
  per run after warm-up (~50 KB / 10 min). The full first run downloads 144
  past + 6 forecast = ~3 MB.
- **License:** ČHMÚ open data, attribution required. The frontend displays
  "© ČHMÚ" wherever ČHMÚ frames are shown.
