const https = require('https');

// =====================================
// DIRECT SUPABASE CONFIGURATION
// =====================================
// This is the exact HTTPS API endpoint and keys used by your ESP32 firmware
const SUPABASE_HOST = 'hijdrgyysmurhahdavtu.supabase.co';
const SUPABASE_PATH = '/rest/v1/sensor_history';
const SUPABASE_KEY = 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpamRyZ3l5c211cmhhaGRhdnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzA0MDAsImV4cCI6MjA5MTMwNjQwMH0.5CEELGQx68ZNKdTjT6IlfXQyiHHOBk47e4UocL1ZeU8";

const REPORT_INTERVAL_MS = 5000; // Send telemetry every 5 seconds for dashboard testing

// Registered Device and User Credentials (matches your active session)
const DEVICE_ID = "fPpApnun99l8W/tswVy73Q==";
const USER_ID = "d6268609-8b13-464e-b8bd-7cbe801c0e37";

console.log(`=============================================================`);
console.log(`=== APMOB DIRECT SUPABASE TELEMETRY SIMULATOR (ESP32-MOCK) ===`);
console.log(`=============================================================`);
console.log(`[Target URL]  https://${SUPABASE_HOST}${SUPABASE_PATH}`);
console.log(`[Device ID]   ${DEVICE_ID}`);
console.log(`[User ID]     ${USER_ID}`);
console.log(`[Interval]    Simulating ESP32 HTTPS sends every ${REPORT_INTERVAL_MS / 1000} seconds...`);
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
    mq4Baseline += getRandomRange(-10, 10);
    mq135Baseline += getRandomRange(-5, 5);
    humidity += getRandomRange(-0.5, 0.5);
  } else if (step < 12) {
    console.log(`[Sim] Food starting to decay...`);
    mq4Baseline += getRandomRange(20, 50);    
    mq135Baseline += getRandomRange(15, 30);  
    humidity += getRandomRange(0.5, 1.5);
  } else {
    console.log(`[Sim] Food is now SPOILED and rotting! ⚠️`);
    mq4Baseline += getRandomRange(80, 150);   
    mq135Baseline += getRandomRange(60, 120); 
    humidity += getRandomRange(2.0, 4.0);
    
    if (mq4Baseline > 1023) mq4Baseline = 1010;
    if (mq135Baseline > 1023) mq135Baseline = 1010;
  }

  // Format exactly like the ESP32 analogRead() and DHT readings
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
  
  console.log(`[ESP32 Direct HTTPS POST] Payload:`);
  console.log(payloadString);

  // Set HTTPS Request Options matching standard ESP32 HTTPClient SSL Headers
  const options = {
    hostname: SUPABASE_HOST,
    port: 443,
    path: SUPABASE_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal', // Request zero-byte response to bypass ESP32 memory overhead
      'Content-Length': Buffer.byteLength(payloadString)
    }
  };

  // Perform secure HTTPS Request
  const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log(`[Supabase Response] HTTP Code: ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[Success] Telemetry successfully inserted into sensor_history!`);
      } else {
        console.error(`[Failure] Supabase rejected insert! Code: ${res.statusCode}`);
        console.error(`[Error Details]`, responseData);
      }
      console.log(`-------------------------------------------------\n`);
    });
  });

  req.on('error', (err) => {
    console.error(`[SSL Error] HTTPS connection to Supabase failed:`, err.message);
    console.log(`-------------------------------------------------\n`);
  });

  req.write(payloadString);
  req.end();

}, REPORT_INTERVAL_MS);
