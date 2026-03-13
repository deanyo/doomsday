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
      document.getElementById('status-badge').textContent = 'Target Reached!';
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
  
  // Historical data (every 2 years for cleaner chart)
  const historicalData = onsData.filter((d, i) => i % 24 === 0 || i === onsData.length - 1);
  
  // Prediction data
  const latestYear = onsData[onsData.length - 1].yearDecimal;
  const predictionYears = [];
  for (let y = Math.floor(latestYear); y <= 2035; y++) {
    predictionYears.push(y);
  }
  const predictionData = predictionYears.map(y => ({
    yearDecimal: y,
    price: regression.slope * y + regression.intercept
  }));
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Historical',
          data: historicalData.map(d => ({ x: d.yearDecimal, y: d.price })),
          borderColor: '#ffb347',
          backgroundColor: 'rgba(255, 179, 71, 0.1)',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.1
        },
        {
          label: 'Predicted',
          data: predictionData.map(d => ({ x: d.yearDecimal, y: d.price })),
          borderColor: 'rgba(255, 179, 71, 0.5)',
          borderDash: [10, 5],
          borderWidth: 3,
          pointRadius: 0,
          tension: 0
        },
        {
          label: 'Target',
          data: [
            { x: Math.min(...historicalData.map(d => d.yearDecimal)), y: targetPrice },
            { x: 2035, y: targetPrice }
          ],
          borderColor: 'rgba(255, 100, 100, 0.6)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `£${context.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: false },
          grid: { color: 'rgba(255, 179, 71, 0.1)' },
          ticks: { color: '#999' }
        },
        y: {
          title: { display: false },
          grid: { color: 'rgba(255, 179, 71, 0.1)' },
          ticks: {
            color: '#999',
            callback: (value) => `£${value.toFixed(2)}`
          }
        }
      }
    }
  });
}

function updateChart() {
  if (!chart) return;
  
  const historicalData = onsData.filter((d, i) => i % 24 === 0 || i === onsData.length - 1);
  
  chart.data.datasets[2].data = [
    { x: Math.min(...historicalData.map(d => d.yearDecimal)), y: targetPrice },
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
