// Parse ONS CSV and calculate regression
let onsData = [];
let regression = { slope: 0, intercept: 0 };
let currentPrice = 4.83;
let currentDate = '2025 JAN';
let targetPrice = 5.00;
let chart = null;

async function loadData() {
  const response = await fetch('ons/series-130326.csv');
  const text = await response.text();
  const lines = text.split('\n').slice(8); // Skip header rows
  
  const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  
  for (const line of lines) {
    const match = line.match(/"(\d{4})(?: ([A-Z]{3}))?","(\d+)"/);
    if (match) {
      const year = parseInt(match[1]);
      const month = match[2] ? monthMap[match[2]] : 0;
      const price = parseInt(match[3]) / 100;
      const yearDecimal = year + month / 12;
      onsData.push({ year, month, yearDecimal, price });
    }
  }
  
  // Get latest price
  const latest = onsData[onsData.length - 1];
  currentPrice = latest.price;
  currentDate = `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][latest.month]} ${latest.year}`;
  
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
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
  const dayStr = `${targetDate.getDate()}${getOrdinal(targetDate.getDate())} ${months[targetDate.getMonth()]}`;
  
  document.getElementById('predicted-date').textContent = dateStr;
  document.getElementById('predicted-day').textContent = dayStr;
  document.getElementById('yearly-rise').textContent = `+${yearlyPercent.toFixed(1)}%`;
  document.getElementById('monthly-rise').textContent = `≈ +${Math.round(monthlyRise * 100)}p/month`;
  
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
  function update() {
    const targetDate = getTargetDate(targetPrice);
    const now = new Date();
    const diff = targetDate - now;
    
    if (diff <= 0) {
      document.getElementById('status-text').textContent = 'target reached!';
      document.getElementById('days').textContent = '000';
      document.getElementById('hours').textContent = '00';
      document.getElementById('minutes').textContent = '00';
      document.getElementById('seconds').textContent = '00';
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
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
  
  // Prediction data - start from latest point to ensure smooth transition
  const latestYear = latestData.yearDecimal;
  const predictionData = [];
  
  // Start prediction from the next year after latest data
  for (let y = Math.ceil(latestYear); y <= 2035; y++) {
    predictionData.push({
      yearDecimal: y,
      price: regression.slope * y + regression.intercept
    });
  }
  
  // Add a connecting point at the exact latest data point using regression
  // This ensures smooth transition from historical to predicted
  const latestPredicted = regression.slope * latestYear + regression.intercept;
  
  // Only add if there's a gap (latest year is not a whole number)
  if (latestYear % 1 !== 0) {
    predictionData.unshift({
      yearDecimal: latestYear,
      price: latestPredicted
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
  
  // Update target line
  chart.data.datasets[5].data = [
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
    targetPrice = parseFloat(btn.dataset.value);
    document.getElementById('threshold').value = targetPrice.toFixed(2);
    updateUI();
    updatePresetButtons();
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
loadData();
updatePresetButtons();
