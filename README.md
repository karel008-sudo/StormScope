# chmi-data

Auto-published radar frames + index.json for the StormScope ČHMÚ overlay.

- **Source:** Czech Hydrometeorological Institute open data
  (https://opendata.chmi.cz/)
- **Cadence:** rebuilt every ~10 minutes by `.github/workflows/chmi-poll.yml`
- **Format:** `frames/<sha8>.png` (598×381, EPSG:3857, transparent
  background) + `index.json` (latest 144 past + 6 forecast frames)
- **Consumer:** the StormScope frontend via jsDelivr.

This branch is force-pushed on every poll — do not commit by hand.
