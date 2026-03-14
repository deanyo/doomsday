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
    <svg class="map-backdrop" viewBox="0 0 1000 1200" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <g class="map-outline">
        <path d="M469 109L531 136L581 190L603 264L592 333L620 405L608 470L629 520L618 602L581 680L533 730L526 804L560 862L545 933L499 994L446 1023L400 1007L378 955L386 889L360 825L308 770L267 709L250 645L233 562L248 476L289 417L320 344L357 286L389 213L424 155Z" />
        <path d="M283 421L254 432L234 461L239 507L271 521L302 503L307 456Z" />
        <path d="M196 407L178 421L182 448L205 460L225 446L223 418Z" />
        <path d="M591 175L643 181L705 213L758 261L785 322L783 383L751 431L706 448L668 423L656 369L628 314L598 248Z" />
        <path d="M528 1038L546 1065L540 1098L516 1116L491 1108L481 1082L490 1053Z" />
        <path d="M218 513L204 534L208 558L227 573L245 562L248 538L236 516Z" />
      </g>
      <g class="map-grid">
        <path d="M455 210L598 249" />
        <path d="M361 324L594 333" />
        <path d="M286 422L609 407" />
        <path d="M249 566L621 520" />
        <path d="M274 704L582 680" />
        <path d="M361 826L560 862" />
      </g>
    </svg>
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
