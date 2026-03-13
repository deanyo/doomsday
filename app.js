// Parse ONS CSV data
async function loadONSData() {
  const response = await fetch('ons/series-130326.csv');
  const text = await response.text();
  const lines = text.split('\n');
  
  let latestPrice = null;
  let latestDate = null;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const match = line.match(/"(\d{4} [A-Z]{3})","(\d+)"/);
    if (match) {
      latestDate = match[1];
      latestPrice = parseInt(match[2]) / 100;
      break;
    }
  }
  
  return { price: latestPrice, date: latestDate };
}

function calculateTargetDate(currentPrice, target = 5) {
  const annualIncrease = 0.24;
  const remaining = target - currentPrice;
  const yearsToTarget = remaining / annualIncrease;
  const millisecondsToTarget = yearsToTarget * 365.25 * 24 * 60 * 60 * 1000;
  
  return new Date(Date.now() + millisecondsToTarget);
}

function updateCountdown(targetDate) {
  const now = new Date();
  const diff = targetDate - now;
  
  if (diff <= 0) {
    document.getElementById('years').textContent = '00';
    document.getElementById('months').textContent = '00';
    document.getElementById('days').textContent = '00';
    document.getElementById('hours').textContent = '00';
    document.getElementById('minutes').textContent = '00';
    document.getElementById('seconds').textContent = '00';
    return;
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(months / 12);
  
  document.getElementById('years').textContent = String(years).padStart(2, '0');
  document.getElementById('months').textContent = String(months % 12).padStart(2, '0');
  document.getElementById('days').textContent = String(days % 30).padStart(2, '0');
  document.getElementById('hours').textContent = String(hours % 24).padStart(2, '0');
  document.getElementById('minutes').textContent = String(minutes % 60).padStart(2, '0');
  document.getElementById('seconds').textContent = String(seconds % 60).padStart(2, '0');
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const ons = await loadONSData();
    const progress = (ons.price / 5) * 100;
    
    document.getElementById('current').textContent = `£${ons.price.toFixed(2)}`;
    document.getElementById('progress').textContent = `${progress.toFixed(1)}%`;
    document.getElementById('updated').textContent = ons.date;
    
    const targetDate = calculateTargetDate(ons.price);
    
    // Update countdown every second
    updateCountdown(targetDate);
    setInterval(() => updateCountdown(targetDate), 1000);
    
  } catch (error) {
    console.error('Failed to load ONS data:', error);
    
    // Fallback
    document.getElementById('current').textContent = '£4.83';
    document.getElementById('progress').textContent = '96.6%';
    document.getElementById('updated').textContent = '2025 JAN';
    
    const targetDate = calculateTargetDate(4.83);
    updateCountdown(targetDate);
    setInterval(() => updateCountdown(targetDate), 1000);
  }
});
