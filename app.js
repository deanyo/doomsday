// Parse ONS CSV data
async function loadONSData() {
  const response = await fetch('ons/series-130326.csv');
  const text = await response.text();
  const lines = text.split('\n');
  
  // Find the latest monthly value (format: "YYYY MMM","value")
  let latestPrice = null;
  let latestDate = null;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const match = line.match(/"(\d{4} [A-Z]{3})","(\d+)"/);
    if (match) {
      latestDate = match[1];
      latestPrice = parseInt(match[2]) / 100; // Convert pence to pounds
      break;
    }
  }
  
  return { price: latestPrice, date: latestDate };
}

function calculateMetrics(currentPrice, target = 5) {
  const difference = target - currentPrice;
  const progress = (currentPrice / target) * 100;
  
  return {
    current: currentPrice,
    target: target,
    difference: difference,
    progress: progress
  };
}

function estimateTimeToTarget(currentPrice, target = 5) {
  // Calculate average annual increase from recent ONS data
  // 2022: £4.10, 2023: £4.56, 2024: £4.77, 2025: £4.83
  // Average increase: ~£0.24/year over last 3 years
  const annualIncrease = 0.24;
  
  const remaining = target - currentPrice;
  const yearsToTarget = remaining / annualIncrease;
  
  const years = Math.floor(yearsToTarget);
  const months = Math.floor((yearsToTarget - years) * 12);
  const days = Math.floor(((yearsToTarget - years) * 12 - months) * 30);
  
  return { years, months, days };
}

function updateCountdown(eta) {
  document.getElementById('years').textContent = String(eta.years).padStart(2, '0');
  document.getElementById('months').textContent = String(eta.months).padStart(2, '0');
  document.getElementById('days').textContent = String(eta.days).padStart(2, '0');
}

function updateClock(data) {
  document.getElementById('current').textContent = `£${data.current.toFixed(2)}`;
  document.getElementById('distance').textContent = `£${data.difference.toFixed(2)}`;
  document.getElementById('progress').textContent = `${data.progress.toFixed(1)}%`;
  
  // Update footer with actual date
  const footer = document.querySelector('footer p:last-child');
  if (data.date) {
    footer.textContent = `Last updated: ${data.date}`;
  }
}

function calculateWorkMinutes(salary, pintPrice) {
  const hourlyRate = salary / (52 * 37.5); // Assume 37.5 hour work week
  const minutes = (pintPrice / hourlyRate) * 60;
  return Math.round(minutes);
}

function updateWorkMetrics(salary) {
  const fiveMinutes = calculateWorkMinutes(salary, 5);
  const eightMinutes = calculateWorkMinutes(salary, 8);
  
  document.getElementById('fivePintMinutes').textContent = `${fiveMinutes} minutes work`;
  document.getElementById('eightPintMinutes').textContent = `${eightMinutes} minutes work`;
}

function drawChart() {
  const canvas = document.getElementById('priceChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  
  // Set canvas size for retina displays
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  const padding = 40;
  
  // Historical data points (year, price)
  const data = [
    [1987, 0.93], [1990, 1.22], [1995, 1.66], [2000, 2.00],
    [2005, 2.41], [2010, 2.94], [2015, 3.45], [2020, 3.70],
    [2022, 4.10], [2023, 4.56], [2024, 4.77], [2025, 4.83]
  ];
  
  // Future projection
  const futureData = [[2025, 4.83], [2026, 5.00]];
  
  // Scale
  const minYear = 1987;
  const maxYear = 2026;
  const minPrice = 0;
  const maxPrice = 5.5;
  
  const xScale = (year) => padding + ((year - minYear) / (maxYear - minYear)) * (width - padding * 2);
  const yScale = (price) => height - padding - ((price - minPrice) / (maxPrice - minPrice)) * (height - padding * 2);
  
  // Clear canvas
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-2').trim();
  ctx.fillRect(0, 0, width, height);
  
  // Draw grid
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--line').trim();
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = yScale(i);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  
  // Draw historical line
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach(([year, price], i) => {
    const x = xScale(year);
    const y = yScale(price);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  // Draw future projection (dotted)
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--danger').trim();
  ctx.beginPath();
  futureData.forEach(([year, price], i) => {
    const x = xScale(year);
    const y = yScale(price);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw data points
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  data.forEach(([year, price]) => {
    const x = xScale(year);
    const y = yScale(price);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw £5 target line
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--danger').trim();
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  const targetY = yScale(5);
  ctx.beginPath();
  ctx.moveTo(padding, targetY);
  ctx.lineTo(width - padding, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Labels
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
  ctx.font = '11px JetBrains Mono';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    ctx.fillText(`£${i}`, padding - 10, yScale(i) + 4);
  }
  
  ctx.textAlign = 'center';
  [1990, 2000, 2010, 2020, 2025].forEach(year => {
    ctx.fillText(year, xScale(year), height - 10);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const ons = await loadONSData();
    const metrics = calculateMetrics(ons.price);
    const eta = estimateTimeToTarget(ons.price);
    
    updateCountdown(eta);
    updateClock({ ...metrics, date: ons.date });
    drawChart();
    
    // Salary slider
    const salarySlider = document.getElementById('salary');
    const salaryDisplay = document.getElementById('salaryDisplay');
    
    updateWorkMetrics(parseInt(salarySlider.value));
    
    salarySlider.addEventListener('input', (e) => {
      const salary = parseInt(e.target.value);
      salaryDisplay.textContent = salary.toLocaleString();
      updateWorkMetrics(salary);
    });
    
    // Redraw chart on resize
    window.addEventListener('resize', drawChart);
    
  } catch (error) {
    console.error('Failed to load ONS data:', error);
    // Fallback to static data
    updateCountdown({ years: 0, months: 8, days: 21 });
    updateClock({
      current: 4.83,
      target: 5,
      difference: 0.17,
      progress: 96.6,
      date: '2025 JAN'
    });
    drawChart();
    updateWorkMetrics(30000);
  }
});
