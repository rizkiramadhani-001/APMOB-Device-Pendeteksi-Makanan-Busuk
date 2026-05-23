const http = require('http');
const https = require('https');

const PORT = 5001;
const SUPABASE_URL = 'hijdrgyysmurhahdavtu.supabase.co';
const SUPABASE_PATH = '/rest/v1/sensor_history';
const SUPABASE_KEY = 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpamRy"
    "Z3l5c211cmhhaGRhdnR1Iiwicm9sZSI6InNlcnZp"
    "Y2Vfcm9sZSIsImlhdCI6MTc3NTczMDQwMCwiZXhw"
    "IjoyMDkxMzA2NDAwfQ.WdtSLpE3WCpt0md9eDtls"
    "S0Xa3PPGCjqJ3yBfHGhpuM";

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/telemetry') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      console.log(`\n[Micro-Server] Received HTTP telemetry from ESP32:`);
      console.log(body);
      
      // Forward payload to Supabase via secure HTTPS
      const options = {
        hostname: SUPABASE_URL,
        port: 443,
        path: SUPABASE_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const supabaseReq = https.request(options, (supabaseRes) => {
        console.log(`[Supabase HTTPS] Response status: ${supabaseRes.statusCode}`);
        
        res.writeHead(supabaseRes.statusCode, { 'Content-Type': 'application/json' });
        
        supabaseRes.on('data', d => {
          res.write(d);
        });
        
        supabaseRes.on('end', () => {
          res.end();
        });
      });

      supabaseReq.on('error', (error) => {
        console.error('[Supabase HTTPS] Connection Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      });

      supabaseReq.write(body);
      supabaseReq.end();
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================================`);
  console.log(`=== APMOB FOOD MONITORING TELEMETRY MICRO-SERVER RUNNING ===`);
  console.log(`=============================================================`);
  console.log(`[Status] Listening on local port: ${PORT}`);
  console.log(`[Info] No NPM installation is required! This is a zero-dependency server.`);
  console.log(`[How to run] Execute: node server.js`);
  console.log(`[Local IP] To find your PC's IP address, open your Command Prompt and type: ipconfig`);
  console.log(`[ESP32 Target] Tell your ESP32 to make plain HTTP POST requests to:`);
  console.log(`               http://<YOUR_PC_IP>:${PORT}/api/telemetry`);
  console.log(`=============================================================`);
});
