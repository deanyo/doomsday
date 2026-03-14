const { regionModels, venueModels } = window.DOOMSDAY_MODEL;
const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const atlasSvgRegionTitles = {
  'london-core': 'Greater London',
  'london-orbit': 'Greater London',
  'northern-ireland': 'Northern Ireland',
  scotland: 'Scotland',
  wales: 'Wales',
  'north-east': 'North East',
  'north-west': 'North West',
  'yorkshire-humber': 'Yorkshire and the Humber',
  'east-midlands': 'East Midlands',
  'west-midlands': 'West Midlands',
  'east-of-england': 'East of England',
  'south-west': 'South West',
  'south-east': 'South East'
};
const atlasCardSides = {
  scotland: 'left',
  'northern-ireland': 'left',
  'north-west': 'left',
  wales: 'left',
  'west-midlands': 'left',
  'south-west': 'left',
  'north-east': 'right',
  'yorkshire-humber': 'right',
  'east-midlands': 'right',
  'east-of-england': 'right',
  'london-core': 'right',
  'london-orbit': 'right',
  'south-east': 'right'
};
const atlasAnchorAdjustments = {
  'london-core': { x: 10, y: -10 },
  'london-orbit': { x: -12, y: 14 }
};

let atlasCurrentPrice = 4.83;
let atlasCurrentDate = 'Jan 2025';
let atlasSvgMarkup = '';
let atlasResizeFrame = 0;

function formatAtlasCurrency(value) {
  return `£${value.toFixed(2)}`;
}

function formatAtlasMultiplier(value) {
  return `${value.toFixed(2)}x`;
}

function getVenueModel(venueKey) {
  return venueModels.find((venue) => venue.key === venueKey) || venueModels[0];
}

function getMapRegions() {
  return regionModels.filter((region) => region.key !== 'gb');
}

function populateVenueSelect() {
  const select = document.getElementById('atlas-venue-select');
  select.innerHTML = venueModels.map((venue) => (
    `<option value="${venue.key}">${venue.label} · ${formatAtlasMultiplier(venue.multiplier)}</option>`
  )).join('');
}

function buildAtlasSvgMarkup(svgText) {
  const parser = new DOMParser();
  const svgDocument = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = svgDocument.documentElement;

  if (!svg.getAttribute('viewBox')) {
    const width = parseFloat(svg.getAttribute('width'));
    const height = parseFloat(svg.getAttribute('height'));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.classList.add('map-backdrop', 'map-backdrop-inline');

  Array.from(svg.querySelectorAll('path')).forEach((path) => {
    path.classList.add('map-region-shape');
  });

  return svg.outerHTML;
}

async function loadAtlasSvg() {
  const response = await fetch('united-kingdom.svg');
  const svgText = await response.text();
  atlasSvgMarkup = buildAtlasSvgMarkup(svgText);
}

function getMapCardMarkup(region, selectedVenue) {
  const estimatedPrice = atlasCurrentPrice * region.multiplier * selectedVenue.multiplier;
  return `
    <article class="map-card" data-region-key="${region.key}">
      <span class="map-card-name">${region.label}</span>
      <strong class="map-card-price">${formatAtlasCurrency(estimatedPrice)}</strong>
      <span class="map-card-meta">${formatAtlasMultiplier(region.multiplier)} region</span>
    </article>
  `;
}

function getAtlasAnchorPoint(svg, region) {
  const regionTitle = atlasSvgRegionTitles[region.key];
  if (!regionTitle) {
    return null;
  }

  const regionPath = Array.from(svg.querySelectorAll('path')).find((path) => path.getAttribute('title') === regionTitle);
  if (!regionPath) {
    return null;
  }

  const box = regionPath.getBBox();
  const adjustment = atlasAnchorAdjustments[region.key] || { x: 0, y: 0 };
  const anchorX = box.x + (box.width / 2) + adjustment.x;
  const anchorY = box.y + (box.height / 2) + adjustment.y;
  const svgBounds = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;

  return {
    x: svgBounds.left + (((anchorX - viewBox.x) / viewBox.width) * svgBounds.width),
    y: svgBounds.top + (((anchorY - viewBox.y) / viewBox.height) * svgBounds.height)
  };
}

function sortMapCardsByAnchor(mapLayout, svg) {
  ['left', 'right'].forEach((side) => {
    const rail = mapLayout.querySelector(`.map-rail-${side}`);
    if (!rail) {
      return;
    }

    const orderedRegions = getMapRegions()
      .filter((region) => (atlasCardSides[region.key] || 'right') === side)
      .map((region) => ({
        region,
        anchorPoint: getAtlasAnchorPoint(svg, region)
      }))
      .sort((left, right) => {
        const leftY = left.anchorPoint ? left.anchorPoint.y : 0;
        const rightY = right.anchorPoint ? right.anchorPoint.y : 0;
        return leftY - rightY;
      });

    orderedRegions.forEach(({ region }) => {
      const card = rail.querySelector(`.map-card[data-region-key="${region.key}"]`);
      if (card) {
        rail.appendChild(card);
      }
    });
  });
}

function drawMapOverlay() {
  const mapLayout = document.getElementById('map-layout');
  if (!mapLayout) {
    return;
  }

  const svg = mapLayout.querySelector('.map-backdrop-inline');
  const overlay = mapLayout.querySelector('.map-overlay');
  if (!svg || !overlay) {
    return;
  }

  sortMapCardsByAnchor(mapLayout, svg);

  const layoutBounds = mapLayout.getBoundingClientRect();
  overlay.setAttribute('viewBox', `0 0 ${layoutBounds.width} ${layoutBounds.height}`);
  overlay.innerHTML = '';

  const regions = getMapRegions();

  regions.forEach((region) => {
    const anchorPoint = getAtlasAnchorPoint(svg, region);
    const card = mapLayout.querySelector(`.map-card[data-region-key="${region.key}"]`);

    if (!anchorPoint || !card) {
      return;
    }

    const cardBounds = card.getBoundingClientRect();
    const pinX = anchorPoint.x - layoutBounds.left;
    const pinY = anchorPoint.y - layoutBounds.top;
    const cardSide = atlasCardSides[region.key] || 'right';
    const cardX = cardSide === 'left'
      ? cardBounds.right - layoutBounds.left
      : cardBounds.left - layoutBounds.left;
    const cardY = (cardBounds.top - layoutBounds.top) + (cardBounds.height / 2);
    const elbowX = cardSide === 'left'
      ? Math.min(pinX - 18, cardX + 24)
      : Math.max(pinX + 18, cardX - 24);

    overlay.insertAdjacentHTML('beforeend', `
      <path class="map-connector" d="M ${pinX} ${pinY} L ${elbowX} ${pinY} L ${cardX} ${cardY}"></path>
      <circle class="map-pin-halo" cx="${pinX}" cy="${pinY}" r="7"></circle>
      <circle class="map-pin-dot" cx="${pinX}" cy="${pinY}" r="3.5"></circle>
    `);
  });
}

function scheduleMapOverlay() {
  if (atlasResizeFrame) {
    cancelAnimationFrame(atlasResizeFrame);
  }

  atlasResizeFrame = requestAnimationFrame(() => {
    atlasResizeFrame = 0;
    drawMapOverlay();
  });
}

function renderMap(selectedVenue) {
  const regionMap = document.getElementById('region-map');
  const baseline = regionModels.find((region) => region.key === 'gb') || regionModels[0];
  const baselinePrice = atlasCurrentPrice * baseline.multiplier * selectedVenue.multiplier;
  const mapRegions = [...getMapRegions()].sort((left, right) => left.mapY - right.mapY);
  const leftCards = mapRegions
    .filter((region) => (atlasCardSides[region.key] || 'right') === 'left')
    .map((region) => getMapCardMarkup(region, selectedVenue))
    .join('');
  const rightCards = mapRegions
    .filter((region) => (atlasCardSides[region.key] || 'right') === 'right')
    .map((region) => getMapCardMarkup(region, selectedVenue))
    .join('');

  regionMap.innerHTML = `
    <div class="map-baseline-card">
      <span class="map-baseline-label">UK average baseline</span>
      <strong class="map-baseline-price">${formatAtlasCurrency(baselinePrice)}</strong>
      <span class="map-baseline-meta">${formatAtlasMultiplier(selectedVenue.multiplier)} venue context applied</span>
    </div>
    <div class="map-layout" id="map-layout">
      <div class="map-rail map-rail-left">${leftCards}</div>
      <div class="map-center">
        <div class="map-viewport">
          ${atlasSvgMarkup}
        </div>
      </div>
      <div class="map-rail map-rail-right">${rightCards}</div>
      <svg class="map-overlay" aria-hidden="true"></svg>
    </div>
  `;

  scheduleMapOverlay();
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
  window.addEventListener('resize', scheduleMapOverlay);

  try {
    await loadOnsBaseline();
  } catch (error) {
    console.warn('Could not load ONS baseline for atlas page', error);
    document.getElementById('atlas-status').textContent = 'could not fetch the ons baseline, so this page is using the fallback £4.83 average.';
  }

  try {
    await loadAtlasSvg();
  } catch (error) {
    console.warn('Could not load atlas SVG backdrop', error);
    document.getElementById('region-map').innerHTML = '<p class="location-status">could not load the uk outline for this page.</p>';
    return;
  }

  renderAtlas();
}

initAtlas();
