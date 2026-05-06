# StormScope

Personal-use storm tracking PWA — radar, lightning, and nowcast centered on your location.

## Planned data sources

- **Radar (CZ + okolí):** [ČHMÚ open data](https://opendata.chmi.cz/meteorology/weather/radar/composite/) — CZRAD network, 5-min cadence, 7-day archive, EPSG:3857 projection (drop-in compatible with OpenStreetMap)
- **Nowcast:** ČHMÚ `FCT_PseudoCAPPI_2km` — COTREC extrapolation, +60 min in 10-min steps
- **Lightning:** [Blitzortung archive](https://www.blitzortung.org/en/archive_data.php) (rendered PNG via backend proxy)
- **Base map:** OpenStreetMap tiles via [Leaflet](https://leafletjs.com/)
- **Global fallback:** [RainViewer free API](https://api.rainviewer.com/public/weather-maps.json) (CORS-friendly, 2 h history)

## Status

🌱 Scaffolding phase. Architecture TBD.

## License

MIT (see [LICENSE](LICENSE) once added)

## Disclaimer

Personal-use project. Not for redistribution of upstream data. Respect each data provider's terms.
