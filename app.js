// Parse ONS CSV and calculate regression
const LOCATION_STORAGE_KEY = 'doomsday-location-model-v1';
const { eightPoundPint: EIGHT_POUND_PINT, regionModels: REGION_MODELS, venueModels: VENUE_MODELS } = window.DOOMSDAY_MODEL;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
const TARGET_MILESTONE_STEP = 0.5;
const TARGET_PRICE_MAX = 10;

let onsData = [];
let regression = { slope: 0, intercept: 0 };
let currentPrice = 4.83;
let currentDate = '2025 JAN';
let targetPrice = 5.0;
let chart = null;
let permissionWatcher = null;
let latestLocalEstimate = null;
const locationState = {
  regionKey: 'gb',
  venueKey: 'standard',
  source: 'default',
  permissionState: 'unknown'
};

function getRegionModel(regionKey) {
  return REGION_MODELS.find((region) => region.key === regionKey) || REGION_MODELS[0];
}

function getVenueModel(venueKey) {
  return VENUE_MODELS.find((venue) => venue.key === venueKey) || VENUE_MODELS[0];
}

function hasRegionModel(regionKey) {
  return REGION_MODELS.some((region) => region.key === regionKey);
}

function hasVenueModel(venueKey) {
  return VENUE_MODELS.some((venue) => venue.key === venueKey);
}

function formatCurrency(value) {
  return `£${value.toFixed(2)}`;
}

function formatMultiplier(value) {
  return `${value.toFixed(2)}x`;
}

function getNextMilestoneTarget(price) {
  const nextStep = (Math.floor(price / TARGET_MILESTONE_STEP) + 1) * TARGET_MILESTONE_STEP;
  return Math.min(TARGET_PRICE_MAX, Number(nextStep.toFixed(2)));
}

function setTargetPrice(nextTargetPrice) {
  targetPrice = nextTargetPrice;
  document.getElementById('threshold').value = targetPrice.toFixed(2);
  document.getElementById('slider-value').textContent = targetPrice.toFixed(2);
  updateUI();
  updatePresetButtons();
}

function autoAdjustTargetToLocalEstimate(localEstimate = latestLocalEstimate) {
  if (!localEstimate) {
    return null;
  }

  const nextTarget = getNextMilestoneTarget(localEstimate.estimatedLocalPint);
  if (nextTarget <= targetPrice + 0.001) {
    return null;
  }

  setTargetPrice(nextTarget);
  return nextTarget;
}

function appendTargetBumpMessage(message, adjustedTarget) {
  if (!adjustedTarget) {
    return message;
  }

  return `${message} slider bumped to £${adjustedTarget.toFixed(2)}, the next milestone above your local estimate.`;
}

function getDistanceKm(latA, lngA, latB, lngB) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(latB - latA);
  const deltaLng = toRadians(lngB - lngA);
  const startLat = toRadians(latA);
  const endLat = toRadians(latB);
  const haversine = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
    + Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(startLat) * Math.cos(endLat);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function matchesRegion(region, latitude, longitude) {
  if (region.matcher?.type === 'circle') {
    return getDistanceKm(latitude, longitude, region.matcher.centerLat, region.matcher.centerLng) <= region.matcher.radiusKm;
  }

  if (region.bounds) {
    return latitude >= region.bounds.minLat
      && latitude <= region.bounds.maxLat
      && longitude >= region.bounds.minLng
      && longitude <= region.bounds.maxLng;
  }

  return false;
}

function loadLocationPreferences() {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const stored = JSON.parse(raw);
    if (stored.regionKey === 'london') {
      stored.regionKey = 'london-orbit';
    }
    if (stored.regionKey && hasRegionModel(stored.regionKey)) {
      locationState.regionKey = stored.regionKey;
    }
    if (stored.venueKey && hasVenueModel(stored.venueKey)) {
      locationState.venueKey = stored.venueKey;
    }
    if (stored.source) {
      locationState.source = stored.source;
    }
  } catch (error) {
    console.warn('Could not load local estimate preferences', error);
  }
}

function saveLocationPreferences() {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
      regionKey: locationState.regionKey,
      venueKey: locationState.venueKey,
      source: locationState.source
    }));
  } catch (error) {
    console.warn('Could not save local estimate preferences', error);
  }
}

function populateLocationControls() {
  const regionSelect = document.getElementById('region-select');
  const venueSelect = document.getElementById('venue-select');

  regionSelect.innerHTML = REGION_MODELS.map((region) => (
    `<option value="${region.key}">${region.label} · ${formatMultiplier(region.multiplier)}</option>`
  )).join('');

  venueSelect.innerHTML = VENUE_MODELS.map((venue) => (
    `<option value="${venue.key}">${venue.label} · ${formatMultiplier(venue.multiplier)}</option>`
  )).join('');

  regionSelect.value = locationState.regionKey;
  venueSelect.value = locationState.venueKey;
}

function setLocationStatus(message) {
  document.getElementById('location-status').textContent = message;
}

function updateLocalEstimate() {
  const region = getRegionModel(locationState.regionKey);
  const venue = getVenueModel(locationState.venueKey);
  const combinedMultiplier = region.multiplier * venue.multiplier;
  const estimatedLocalPint = currentPrice * combinedMultiplier;
  const gapToEight = Math.max(0, EIGHT_POUND_PINT - estimatedLocalPint);
  const progressToEight = (estimatedLocalPint / EIGHT_POUND_PINT) * 100;

  document.getElementById('region-select').value = region.key;
  document.getElementById('venue-select').value = venue.key;
  document.getElementById('local-price').textContent = formatCurrency(estimatedLocalPint);
  document.getElementById('local-formula').textContent = `${formatCurrency(currentPrice)} uk avg × ${formatMultiplier(region.multiplier)} × ${formatMultiplier(venue.multiplier)}`;
  document.getElementById('local-multiplier').textContent = formatMultiplier(combinedMultiplier);
  document.getElementById('local-region-note').textContent = `${region.label} · ${venue.label.toLowerCase()}`;
  document.getElementById('local-gap').textContent = estimatedLocalPint >= EIGHT_POUND_PINT ? 'past £8' : formatCurrency(gapToEight);
  document.getElementById('local-progress').textContent = estimatedLocalPint >= EIGHT_POUND_PINT
    ? `${progressToEight.toFixed(1)}% of the £8 line in this mock model`
    : `${progressToEight.toFixed(1)}% of the way there locally`;

  latestLocalEstimate = {
    region,
    venue,
    combinedMultiplier,
    estimatedLocalPint,
    gapToEight,
    progressToEight
  };

  return latestLocalEstimate;
}

function updateLocateButton(permissionState = locationState.permissionState) {
  const locateButton = document.getElementById('locate-btn');

  if (!navigator.geolocation) {
    locateButton.disabled = true;
    locateButton.textContent = 'location unavailable';
    return;
  }

  locateButton.disabled = false;
  if (permissionState === 'granted') {
    locateButton.textContent = 'refresh location';
    return;
  }
  if (permissionState === 'denied') {
    locateButton.textContent = 'location blocked';
    return;
  }

  locateButton.textContent = 'use my location';
}

function resolveRegionByCoordinates(latitude, longitude) {
  const matchedRegion = REGION_MODELS.find((region) => matchesRegion(region, latitude, longitude));

  return matchedRegion || getRegionModel('gb');
}

async function syncGeolocationPermission() {
  if (!navigator.geolocation || !navigator.permissions?.query) {
    updateLocateButton();
    return;
  }

  try {
    permissionWatcher = await navigator.permissions.query({ name: 'geolocation' });
    locationState.permissionState = permissionWatcher.state;
    updateLocateButton(permissionWatcher.state);

    permissionWatcher.onchange = () => {
      locationState.permissionState = permissionWatcher.state;
      updateLocateButton(permissionWatcher.state);

      if (permissionWatcher.state === 'denied' && locationState.source === 'browser') {
        locationState.regionKey = 'gb';
        locationState.source = 'default';
        saveLocationPreferences();
        updateLocalEstimate();
        setLocationStatus('location permission is blocked, so the local estimate has fallen back to the uk baseline. you can still pick a region manually.');
      }
    };
  } catch (error) {
    console.warn('Could not read geolocation permission state', error);
    updateLocateButton();
  }
}

function handleLocationSuccess(position) {
  const { latitude, longitude } = position.coords;
  const region = resolveRegionByCoordinates(latitude, longitude);

  locationState.regionKey = region.key;
  locationState.source = 'browser';
  saveLocationPreferences();
  const localEstimate = updateLocalEstimate();
  const adjustedTarget = autoAdjustTargetToLocalEstimate(localEstimate);

  if (region.key === 'gb') {
    setLocationStatus(appendTargetBumpMessage('browser location worked, but the coordinate fell outside the mocked uk region boxes, so this estimate stayed on the uk baseline.', adjustedTarget));
  } else if (region.key === 'london-core') {
    setLocationStatus(appendTargetBumpMessage('browser location landed inside the tighter london core zone. outer london and commuter towns should usually fall back into the surrounding regional boxes instead.', adjustedTarget));
  } else if (region.key === 'london-orbit') {
    setLocationStatus(appendTargetBumpMessage('browser location mapped you into the london orbit band. that is meant for outer london and nearby commuter-belt pricing without calling everything generic london.', adjustedTarget));
  } else {
    setLocationStatus(appendTargetBumpMessage(`browser location mapped you to ${region.label.toLowerCase()} using a rough regional box. only the derived region is stored in this browser.`, adjustedTarget));
  }
}

function handleLocationError(error) {
  const permissionDenied = error.code === 1 || error.code === error.PERMISSION_DENIED;
  locationState.permissionState = permissionDenied ? 'denied' : locationState.permissionState;
  updateLocateButton(locationState.permissionState);

  if (permissionDenied) {
    setLocationStatus('location permission was denied. pick a region manually or re-enable location in the browser and try again.');
    return;
  }

  setLocationStatus('could not get your browser location just now. the local estimate is still usable with the manual region picker.');
}

function requestBrowserLocation() {
  if (!navigator.geolocation) {
    setLocationStatus('this browser does not expose geolocation, so use the manual region picker instead.');
    return;
  }

  setLocationStatus('asking the browser for your approximate location...');
  navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 300000
  });
}

function initLocationControls() {
  loadLocationPreferences();
  populateLocationControls();
  updateLocateButton();
  updateLocalEstimate();

  document.getElementById('region-select').addEventListener('change', (event) => {
    locationState.regionKey = event.target.value;
    locationState.source = 'manual';
    saveLocationPreferences();
    const localEstimate = updateLocalEstimate();
    const adjustedTarget = autoAdjustTargetToLocalEstimate(localEstimate);
    setLocationStatus(appendTargetBumpMessage(`manual region set to ${getRegionModel(locationState.regionKey).label.toLowerCase()}. use browser location any time to replace it with an automatic estimate.`, adjustedTarget));
  });

  document.getElementById('venue-select').addEventListener('change', (event) => {
    locationState.venueKey = event.target.value;
    saveLocationPreferences();
    const localEstimate = updateLocalEstimate();
    const adjustedTarget = autoAdjustTargetToLocalEstimate(localEstimate);

    const venue = getVenueModel(locationState.venueKey);
    if (locationState.source === 'browser') {
      setLocationStatus(appendTargetBumpMessage(`browser region estimate kept, venue context switched to ${venue.label.toLowerCase()}.`, adjustedTarget));
    } else if (locationState.source === 'manual') {
      setLocationStatus(appendTargetBumpMessage(`manual region estimate kept, venue context switched to ${venue.label.toLowerCase()}.`, adjustedTarget));
    } else if (locationState.source === 'default') {
      setLocationStatus(appendTargetBumpMessage(`venue context switched to ${venue.label.toLowerCase()}.`, adjustedTarget));
    }
  });

  document.getElementById('locate-btn').addEventListener('click', requestBrowserLocation);

  if (locationState.source === 'browser') {
    const region = getRegionModel(locationState.regionKey);
    setLocationStatus(`using your last browser-derived region estimate for ${region.label.toLowerCase()}. refresh location to update it.`);
  }

  syncGeolocationPermission();
}

async function loadData() {
  onsData = [];
  const response = await fetch('ons/series-130326.csv');
  const text = await response.text();
  const lines = text.split('\n').slice(8); // Skip header rows

  for (const line of lines) {
    const match = line.match(/"(\d{4})(?: ([A-Z]{3}))?","(\d+)"/);
    if (match) {
      const year = parseInt(match[1]);
      const month = match[2] ? MONTH_MAP[match[2]] : 0;
      const price = parseInt(match[3]) / 100;
      const yearDecimal = year + month / 12;
      onsData.push({ year, month, yearDecimal, price });
    }
  }
  
  // Get latest price
  const latest = onsData[onsData.length - 1];
  currentPrice = latest.price;
  currentDate = `${MONTH_NAMES[latest.month]} ${latest.year}`;
  
  // Calculate regression from 2015 onwards
  const recentData = onsData.filter(d => d.year >= 2015);
  const n = recentData.length;
  const sumX = recentData.reduce((sum, d) => sum + d.yearDecimal, 0);
  const sumY = recentData.reduce((sum, d) => sum + d.price, 0);
  const sumXY = recentData.reduce((sum, d) => sum + d.yearDecimal * d.price, 0);
  const sumX2 = recentData.reduce((sum, d) => sum + d.yearDecimal * d.yearDecimal, 0);
  
  regression.slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  regression.intercept = (sumY - regression.slope * sumX) / n;
  
  // Log regression stats for verification
  console.log('Regression (2015-2025):', {
    slope: regression.slope.toFixed(4),
    slopePerYear: `£${regression.slope.toFixed(2)}/year`,
    intercept: regression.intercept.toFixed(2),
    dataPoints: n,
    r2: calculateR2(recentData)
  });
  
  updateUI();
  autoAdjustTargetToLocalEstimate();
  initChart();
  startCountdown();
}

function calculateR2(data) {
  const yMean = data.reduce((sum, d) => sum + d.price, 0) / data.length;
  const ssTotal = data.reduce((sum, d) => sum + Math.pow(d.price - yMean, 2), 0);
  const ssResidual = data.reduce((sum, d) => {
    const predicted = regression.slope * d.yearDecimal + regression.intercept;
    return sum + Math.pow(d.price - predicted, 2);
  }, 0);
  return (1 - ssResidual / ssTotal).toFixed(4);
}

function getTargetDate(target) {
  const yearsFromNow = (target - currentPrice) / regression.slope;
  const latest = onsData[onsData.length - 1];
  const latestYear = latest.yearDecimal;
  const targetYear = latestYear + yearsFromNow;
  
  const year = Math.floor(targetYear);
  const monthDecimal = (targetYear - year) * 12;
  const month = Math.floor(monthDecimal);
  const day = Math.floor((monthDecimal - month) * 30) + 1;
  
  return new Date(year, month, day);
}

function updateUI() {
  const target = targetPrice;
  const targetDate = getTargetDate(target);
  const remaining = target - currentPrice;
  const yearlyRise = regression.slope;
  const yearlyPercent = (yearlyRise / currentPrice) * 100;
  const monthlyRise = yearlyRise / 12;
  
  document.getElementById('current-price').textContent = `£${currentPrice.toFixed(2)}`;
  document.getElementById('current-date').textContent = `${currentDate} (latest ONS)`;
  document.getElementById('target-price').textContent = `£${target.toFixed(2)}`;
  document.getElementById('target-display').textContent = target.toFixed(2);
  document.getElementById('remaining').textContent = `£${remaining.toFixed(2)} to go`;

  const dateStr = `${MONTH_NAMES[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
  const dayStr = `${targetDate.getDate()}${getOrdinal(targetDate.getDate())} ${MONTH_NAMES[targetDate.getMonth()]}`;
  
  document.getElementById('predicted-date').textContent = dateStr;
  document.getElementById('predicted-day').textContent = dayStr;
  document.getElementById('yearly-rise').textContent = `+${yearlyPercent.toFixed(1)}%`;
  document.getElementById('monthly-rise').textContent = `≈ +${Math.round(monthlyRise * 100)}p/month`;
  latestLocalEstimate = updateLocalEstimate();
  
  if (chart) {
    updateChart();
  }
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function startCountdown() {
  const yearsGroup = document.getElementById('years-group');

  function update() {
    const targetDate = getTargetDate(targetPrice);
    const now = new Date();
    const diff = targetDate - now;
    
    if (diff <= 0) {
      const statusText = document.getElementById('status-text');
      if (statusText) {
        statusText.textContent = 'target reached!';
      }
      yearsGroup.classList.add('is-hidden');
      document.getElementById('years').textContent = '00';
      document.getElementById('days').textContent = '000';
      document.getElementById('hours').textContent = '00';
      document.getElementById('minutes').textContent = '00';
      document.getElementById('seconds').textContent = '00';
      return;
    }
    
    const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const days = years > 0 ? totalDays % 365 : totalDays;
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (years > 0) {
      yearsGroup.classList.remove('is-hidden');
      document.getElementById('years').textContent = String(years).padStart(2, '0');
    } else {
      yearsGroup.classList.add('is-hidden');
      document.getElementById('years').textContent = '00';
    }

    document.getElementById('days').textContent = String(days).padStart(3, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
  }
  
  update();
  setInterval(update, 1000);
}

function initChart() {
  const ctx = document.getElementById('price-chart').getContext('2d');
  
  // Historical data from 2000 onwards - ONLY annual entries (no month specified in CSV)
  // Filter out monthly data to avoid duplicates
  const historicalData = onsData.filter(d => {
    // Only include if year >= 2000 AND it's an annual entry (month would be 0 for both annual and January)
    // We need to check the original data structure - annual entries have no month in the CSV
    return d.year >= 2000 && d.month === 0;
  });
  
  // Remove duplicates by keeping only unique years
  const uniqueHistorical = [];
  const seenYears = new Set();
  for (const d of historicalData) {
    const yearKey = Math.floor(d.yearDecimal);
    if (!seenYears.has(yearKey)) {
      seenYears.add(yearKey);
      uniqueHistorical.push(d);
    }
  }
  
  const latestData = onsData[onsData.length - 1];
  
  // Only add latest if it's not already in the annual data
  const lastHistorical = uniqueHistorical[uniqueHistorical.length - 1];
  if (!lastHistorical || lastHistorical.yearDecimal !== latestData.yearDecimal) {
    uniqueHistorical.push(latestData);
  }
  
  // CRITICAL: Sort by yearDecimal to ensure chronological order
  uniqueHistorical.sort((a, b) => a.yearDecimal - b.yearDecimal);
  
  console.log('After sort, last 3 historical:', uniqueHistorical.slice(-3).map(d => ({ year: d.yearDecimal, price: d.price })));
  
  // Prediction data - force smooth transition by starting from actual latest price
  const latestYear = latestData.yearDecimal;
  const latestPrice = latestData.price;
  const predictionData = [];
  
  // Calculate what the regression would predict for each future year
  for (let y = Math.ceil(latestYear); y <= 2035; y++) {
    // Adjust prediction to start from actual latest price, not regression intercept
    const yearsFromLatest = y - latestYear;
    const predictedPrice = latestPrice + (regression.slope * yearsFromLatest);
    
    predictionData.push({
      yearDecimal: y,
      price: predictedPrice
    });
  }
  
  // Find transition point for styling
  const transitionIndex = uniqueHistorical.length - 1;
  
  // Single continuous line
  const lineData = [
    ...uniqueHistorical.map(d => ({ x: d.yearDecimal, y: d.price })),
    ...predictionData.map(d => ({ x: d.yearDecimal, y: d.price }))
  ];
  
  // Debug: log the data
  console.log('Historical points:', uniqueHistorical.length);
  console.log('Prediction points:', predictionData.length);
  console.log('Total chart points:', lineData.length);
  console.log('Transition at index:', transitionIndex);
  console.log('Sample data:', {
    firstHistorical: lineData[0],
    lastHistorical: lineData[transitionIndex],
    firstPrediction: lineData[transitionIndex + 1],
    lastPrediction: lineData[lineData.length - 1]
  });
  
  // Check for duplicate X values
  const xValues = lineData.map(d => d.x);
  const duplicates = xValues.filter((x, i) => xValues.indexOf(x) !== i);
  if (duplicates.length > 0) {
    console.error('DUPLICATE X VALUES FOUND:', duplicates);
    console.log('Full data with duplicates:', lineData.filter(d => duplicates.includes(d.x)));
  } else {
    console.log('✓ No duplicates found');
  }
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Pint Price',
          data: lineData,
          segment: {
            borderColor: (ctx) => {
              return ctx.p0DataIndex >= transitionIndex ? 'rgba(179, 244, 243, 0.5)' : '#b3f4f3';
            },
            borderDash: (ctx) => {
              return ctx.p0DataIndex >= transitionIndex ? [10, 5] : [];
            }
          },
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.1,
          order: 1
        },
        // Target line
        {
          label: 'Target',
          data: [
            { x: 2000, y: targetPrice },
            { x: 2035, y: targetPrice }
          ],
          borderColor: 'rgba(255, 100, 100, 0.6)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          hoverBorderWidth: 2,
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (tooltipItem) => {
            // Only show tooltip for the main line (dataset 0)
            return tooltipItem.datasetIndex === 0;
          },
          callbacks: {
            title: (items) => {
              const year = Math.floor(items[0].parsed.x);
              return `Year ${year}`;
            },
            label: (context) => {
              return `£${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: false },
          grid: { color: '#3f3951' },
          ticks: { color: '#9a90b3' }
        },
        y: {
          title: { display: false },
          grid: { color: '#3f3951' },
          ticks: {
            color: '#9a90b3',
            callback: (value) => `£${value.toFixed(2)}`
          }
        }
      }
    }
  });
}

function createReferenceLine(price) {
  return {
    label: `£${price}`,
    data: [
      { x: 2000, y: price },
      { x: 2035, y: price }
    ],
    borderColor: 'rgba(150, 150, 150, 0.3)',
    borderDash: [3, 3],
    borderWidth: 1,
    pointRadius: 0,
    pointHoverRadius: 0,
    hoverBorderWidth: 1
  };
}

function updateChart() {
  if (!chart) return;
  
  // Update target line (dataset 1)
  chart.data.datasets[1].data = [
    { x: 2000, y: targetPrice },
    { x: 2035, y: targetPrice }
  ];
  chart.update();
}

// Threshold controls
document.getElementById('threshold').addEventListener('input', (e) => {
  targetPrice = parseFloat(e.target.value);
  document.getElementById('slider-value').textContent = targetPrice.toFixed(2);
  updateUI();
  updatePresetButtons();
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setTargetPrice(parseFloat(btn.dataset.value));
  });
});

function updatePresetButtons() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (Math.abs(parseFloat(btn.dataset.value) - targetPrice) < 0.01) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Initialize
initLocationControls();
loadData();
updatePresetButtons();
