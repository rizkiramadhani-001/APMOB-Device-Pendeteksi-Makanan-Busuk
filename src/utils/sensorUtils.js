import toast from 'react-hot-toast';

export const parseDataString = (decoded) => {
  let parsedSensorData = { mq4: '--', mq135: '--', humidity: '--' };
  try {
    const data = JSON.parse(decoded);
    if (data.mq4 !== undefined || data.mq135 !== undefined || data.humidity !== undefined) {
      parsedSensorData = {
        mq4: data.mq4 !== undefined ? data.mq4 : '--',
        mq135: data.mq135 !== undefined ? data.mq135 : '--',
        humidity: data.humidity !== undefined ? data.humidity : '--',
      };
      return parsedSensorData;
    }
  } catch (e) {
    const parts = decoded.split(',').map(s => s.trim());
    if (parts.length >= 3) {
      parsedSensorData = {
        mq4: parts[0] || '--',
        mq135: parts[1] || '--',
        humidity: parts[2] || '--'
      };
    }
  }
  return parsedSensorData;
};

export const calculateFreshness = (mq4, mq135, hum) => {
  let score = 100;
  
  if (mq4 !== '--' && !isNaN(parseFloat(mq4))) {
    const g = parseFloat(mq4);
    if (g > 800) score -= 40;
    else if (g > 400) score -= 20;
    else if (g > 200) score -= 10;
  }
  if (mq135 !== '--' && !isNaN(parseFloat(mq135))) {
    const t = parseFloat(mq135);
    if (t > 800) score -= 40;
    else if (t > 500) score -= 20;
    else if (t > 300) score -= 10;
  }
  if (hum !== '--' && !isNaN(parseFloat(hum))) {
    const h = parseFloat(hum);
    if (h > 80) score -= 15;
    else if (h > 60) score -= 5;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  if (score >= 80) return { label: 'Fresh & Safe', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', score, message: "Optimal air quality detected. Minimal spoilage risk." };
  if (score >= 50) return { label: 'Deteriorating', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', score, message: "Elevated gas levels detected. Spoilage process may have begun." };
  return { label: 'Spoiled / Unsafe', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', score, message: "Warning: High spoilage indicators (Methane/Ammonia). Do not consume." };
};

export const exportToCSV = (device) => {
  if (!device.history || device.history.length === 0) {
    toast.error("No historical data to export yet.");
    return;
  }
  const headers = ["Time", "Methane (MQ4 PPM)", "Air Quality (MQ135 PPM)", "Humidity (%)"];
  const rows = device.history.map(row => [row.time, row.mq4, row.mq135, row.humidity]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${device.name.replace(/\s+/g, '_')}_Export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("Data successfully exported!");
};
