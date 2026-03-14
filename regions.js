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
        <path d="M506 84L575 116L621 163L652 225L648 290L674 346L668 424L692 483L680 572L643 657L602 716L593 790L619 856L603 934L555 1006L489 1061L431 1048L393 995L399 916L366 844L310 774L274 709L255 628L256 549L284 473L323 414L357 349L392 286L424 213L460 150Z" />
        <path d="M247 347L286 370L314 410L307 480L280 539L238 582L188 565L162 522L160 462L184 397Z" />
        <path d="M167 371L185 387L182 413L160 429L141 414L145 388Z" />
        <path d="M571 123L604 137L628 163L621 193L591 203L567 180L560 148Z" />
        <path d="M648 148L679 163L701 190L695 220L664 228L639 205L633 177Z" />
        <path d="M739 217L760 228L774 249L769 271L748 278L730 262L726 240Z" />
        <path d="M313 517L330 528L334 548L321 565L300 567L288 553L291 532Z" />
        <path d="M235 571L252 583L255 603L242 619L222 621L209 605L213 584Z" />
        <path d="M563 1043L580 1057L583 1078L568 1096L546 1099L531 1081L536 1059Z" />
        <path class="map-border" d="M229 398L257 408L278 435L273 482L253 523" />
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
