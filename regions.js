const { regionModels, venueModels } = window.DOOMSDAY_MODEL;
const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let atlasCurrentPrice = 4.83;
let atlasCurrentDate = 'Jan 2025';

function formatAtlasCurrency(value) {
  return `£${value.toFixed(2)}`;
}

function formatAtlasMultiplier(value) {
  return `${value.toFixed(2)}x`;
}

function getVenueModel(venueKey) {
  return venueModels.find((venue) => venue.key === venueKey) || venueModels[0];
}

function populateVenueSelect() {
  const select = document.getElementById('atlas-venue-select');
  select.innerHTML = venueModels.map((venue) => (
    `<option value="${venue.key}">${venue.label} · ${formatAtlasMultiplier(venue.multiplier)}</option>`
  )).join('');
}

function renderMap(selectedVenue) {
  const regionMap = document.getElementById('region-map');
  regionMap.innerHTML = `
    <img class="map-backdrop map-backdrop-image" src="united-kingdom.svg" alt="" aria-hidden="true">
    ${regionModels.map((region) => {
      const estimatedPrice = atlasCurrentPrice * region.multiplier * selectedVenue.multiplier;
      return `
        <article class="map-chip${region.key === 'gb' ? ' map-chip-anchor' : ''}" style="left:${region.mapX}%; top:${region.mapY}%;">
          <span class="map-chip-name">${region.label}</span>
          <strong class="map-chip-price">${formatAtlasCurrency(estimatedPrice)}</strong>
          <span class="map-chip-meta">${formatAtlasMultiplier(region.multiplier)} region</span>
        </article>
      `;
    }).join('')}
  `;
}

function renderTable(selectedVenue) {
  const table = document.getElementById('atlas-table');
  const rows = [...regionModels]
    .sort((left, right) => right.multiplier - left.multiplier)
    .map((region) => {
      const estimatedPrice = atlasCurrentPrice * region.multiplier * selectedVenue.multiplier;
      return `
        <article class="atlas-row">
          <div>
            <div class="atlas-row-title">${region.label}</div>
            <div class="atlas-row-note">${formatAtlasMultiplier(region.multiplier)} region × ${formatAtlasMultiplier(selectedVenue.multiplier)} venue</div>
          </div>
          <div class="atlas-row-value">${formatAtlasCurrency(estimatedPrice)}</div>
        </article>
      `;
    });

  table.innerHTML = rows.join('');
}

function renderAtlas() {
  const selectedVenue = getVenueModel(document.getElementById('atlas-venue-select').value);
  document.getElementById('atlas-status').textContent = `latest ons baseline: ${formatAtlasCurrency(atlasCurrentPrice)} from ${atlasCurrentDate}. current venue context: ${selectedVenue.label.toLowerCase()}.`;
  renderMap(selectedVenue);
  renderTable(selectedVenue);
}

async function loadOnsBaseline() {
  const response = await fetch('ons/series-130326.csv');
  const text = await response.text();
  const lines = text.split('\n').slice(8);
  const data = [];

  for (const line of lines) {
    const match = line.match(/"(\d{4})(?: ([A-Z]{3}))?","(\d+)"/);
    if (!match) {
      continue;
    }

    const year = parseInt(match[1], 10);
    const month = match[2] ? monthMap[match[2]] : 0;
    const price = parseInt(match[3], 10) / 100;
    data.push({ year, month, price });
  }

  const latest = data[data.length - 1];
  atlasCurrentPrice = latest.price;
  atlasCurrentDate = `${monthNames[latest.month]} ${latest.year}`;
}

async function initAtlas() {
  populateVenueSelect();
  document.getElementById('atlas-venue-select').addEventListener('change', renderAtlas);

  try {
    await loadOnsBaseline();
  } catch (error) {
    console.warn('Could not load ONS baseline for atlas page', error);
    document.getElementById('atlas-status').textContent = 'could not fetch the ons baseline, so this page is using the fallback £4.83 average.';
  }

  renderAtlas();
}

initAtlas();
