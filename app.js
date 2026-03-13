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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const ons = await loadONSData();
    const metrics = calculateMetrics(ons.price);
    const eta = estimateTimeToTarget(ons.price);
    
    updateCountdown(eta);
    updateClock({ ...metrics, date: ons.date });
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
  }
});
