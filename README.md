# The £8 Pint Clock

Tracking Britain's march toward the first £8 average pint.

## What is this?

A doomsday clock for UK pint prices. The UK average draught lager pint is currently £4.83 (ONS, Jan 2025). This site tracks how close we are to the £8 psychological barrier already appearing in London pubs.

## Tech Stack

- **Frontend**: Static HTML/CSS/JS (GitHub Pages)
- **Data Source**: ONS Average Price of Draught Lager (CZMS series)

## Development

```bash
# Serve locally
python3 -m http.server 8000

# Visit
http://localhost:8000
```

## Data

ONS data is in `ons/series-130326.csv`:
- Latest: 483 pence (£4.83) - Jan 2025
- Next release: 25 March 2026

## Roadmap

### v1 (Current)
- [x] Static clock display
- [x] ONS data integration
- [x] Price milestones timeline
- [x] Work-per-pint metric

### v2 (Future)
- [ ] Cloudflare Worker API
- [ ] User submissions (£8+ sightings)
- [ ] UK map of sightings

## License

MIT
