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

function calculateMetrics(currentPrice, target = 8) {
  const difference = target - currentPrice;
  const progress = (currentPrice / target) * 100;
  
  return {
    current: currentPrice,
    target: target,
    difference: difference,
    progress: progress
  };
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
    updateClock({ ...metrics, date: ons.date });
  } catch (error) {
    console.error('Failed to load ONS data:', error);
    // Fallback to static data
    updateClock({
      current: 4.83,
      target: 8,
      difference: 3.17,
      progress: 60.4,
      date: '2025 JAN'
    });
  }
});
