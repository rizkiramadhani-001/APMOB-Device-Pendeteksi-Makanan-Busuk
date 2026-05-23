const http = require('http');

// =====================================
// SIMULATOR CONFIGURATION
// =====================================
const SERVER_HOST = 'localhost'; // Send to the local micro-server running on this PC
const SERVER_PORT = 5001;        // Local gateway port
const REPORT_INTERVAL_MS = 5000; // Send telemetry every 5 seconds for responsive testing

// Registered Device and User Credentials (matches your active session)
const DEVICE_ID = "fPpApnun99l8W/tswVy73Q==";
const USER_ID = "b44749f9-7aa3-4046-ba3e-58be660726a3";

console.log(`=============================================================`);
console.log(`=== APMOB FOOD MONITORING MOCK ESP32 HARDWARE DEVICE ===`);
console.log(`=============================================================`);
console.log(`[Target Gateway] http://${SERVER_HOST}:${SERVER_PORT}/api/telemetry`);
console.log(`[Device ID] ${DEVICE_ID}`);
console.log(`[User ID]   ${USER_ID}`);
console.log(`[Interval]  Sending mock readings every ${REPORT_INTERVAL_MS / 1000} seconds...`);
console.log(`=============================================================\n`);

// Helper to generate a random number within a range
const getRandomRange = (min, max) => Math.random() * (max - min) + min;

// Simulation variables (start with normal healthy food baseline)
let mq4Baseline = 150;    // Healthy low methane baseline
let mq135Baseline = 100;  // Healthy air quality baseline
let humidity = 65.0;      // Standard room humidity %
let temperature = 24.5;   // Room temp in C

let step = 0;

// Periodic Simulation Loop
setInterval(() => {
  step++;

  // Simulate dynamic food conditions over time:
  // - First 5 readings: Fresh food
  // - Next 5 readings: Slow decay starts
  // - After 10 readings: Spoilage / heavy methane & bad air quality release!
  if (step < 6) {
    // Normal fluctuations
    mq4Baseline += getRandomRange(-10, 10);
    mq135Baseline += getRandomRange(-5, 5);
    humidity += getRandomRange(-0.5, 0.5);
  } else if (step < 12) {
    // Spoilage begins
    console.log(`[Status] SIMULATING: Food starting to decay...`);
    mq4Baseline += getRandomRange(20, 50);    // Methane increasing
    mq135Baseline += getRandomRange(15, 30);  // Air Quality index rising (gases released)
    humidity += getRandomRange(0.5, 1.5);
  } else {
    // Rotten/Spoiled State
    console.log(`[Status] SIMULATING: Food is now SPOILED and rotting! ⚠️`);
    mq4Baseline += getRandomRange(80, 150);   // Heavy methane spike
    mq135Baseline += getRandomRange(60, 120); // Severe pollution
    humidity += getRandomRange(2.0, 4.0);
    
    // Cap values to standard sensor ceiling
    if (mq4Baseline > 1023) mq4Baseline = 1010;
    if (mq135Baseline > 1023) mq135Baseline = 1010;
  }

  // Format exactly like the ESP32 analogRead() integer representations
  const payload = {
    device_id: DEVICE_ID,
    user_id: USER_ID,
    mq4: Math.round(mq4Baseline),
    mq135: Math.round(mq135Baseline),
    gas: Math.round(mq4Baseline),        // Legacy compatibility column (MQ-4 mapping)
    humidity: parseFloat(humidity.toFixed(1)),
    temperature: Math.round(mq135Baseline) // Legacy compatibility column (MQ-135 mapping)
  };

  const payloadString = JSON.stringify(payload);
  
  console.log(`[ESP32 -> POST] Sending mock telemetry:`);
  console.log(payloadString);

  // Set HTTP Request Options matching standard Arduino HTTPClient
  const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/api/telemetry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadString)
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log(`[Response Status] ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[Success] Telemetry successfully posted!`);
      } else {
        console.error(`[Error] Server rejected telemetry:`, responseData);
      }
      console.log(`-------------------------------------------------\n`);
    });
  });

  req.on('error', (err) => {
    console.error(`[Connection Failed] Unable to connect to your micro-server at http://${SERVER_HOST}:${SERVER_PORT}`);
    console.error(`                    Make sure to run 'node server.js' first!`);
    console.log(`-------------------------------------------------\n`);
  });

  req.write(payloadString);
  req.end();

}, REPORT_INTERVAL_MS);
