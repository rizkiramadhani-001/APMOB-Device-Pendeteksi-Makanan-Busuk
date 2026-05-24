const http = require('http');
const https = require('https');

const PORT = 80;
const SUPABASE_URL = 'hijdrgyysmurhahdavtu.supabase.co';
const SUPABASE_PATH = '/rest/v1/sensor_history';
// Fallback to hardcoded key if not in env
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpamRy" +
    "Z3l5c211cmhhaGRhdnR1Iiwicm9sZSI6InNlcnZp" +
    "Y2Vfcm9sZSIsImlhdCI6MTc3NTczMDQwMCwiZXhw" +
    "IjoyMDkxMzA2NDAwfQ.WdtSLpE3WCpt0md9eDtls" +
    "S0Xa3PPGCjqJ3yBfHGhpuM";

// Helper to send Pusher Notification
function sendPusherNotification(mq4, gas) {
    return new Promise((resolve, reject) => {
        const url = "https://0664ee09-f5b7-4160-ac77-2a400c0f0854.pushnotifications.pusher.com/publish_api/v1/instances/0664ee09-f5b7-4160-ac77-2a400c0f0854/publishes";
        
        const payload = JSON.stringify({
            interests: ["spoiled-food"],
            web: {
                notification: {
                    title: "Food Spoilage Alert!",
                    body: `High gas levels detected (MQ4: ${mq4 || gas}). Food might be spoiling!`
                }
            }
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 6422F562EEB85422937DEC0142874E48306D0DDF21310E2DA4ACDAA1C10F3C25',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[Pusher Beams] Successfully sent notification: ${data}`);
                    resolve(true);
                } else {
                    console.error(`[Pusher Beams] Error sending notification: ${res.statusCode} ${data}`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (e) => {
            console.error(`[Pusher Beams] Request error: ${e.message}`);
            resolve(false);
        });
        
        req.write(payload);
        req.end();
    });
}

// Helper to make requests to Supabase REST API
function supabaseRequest(path, method, bodyObj) {
    return new Promise((resolve, reject) => {
        const payload = bodyObj ? JSON.stringify(bodyObj) : '';
        const options = {
            hostname: SUPABASE_URL,
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal',
            }
        };
        if (bodyObj) {
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(data ? JSON.parse(data) : null); } catch(e) { resolve(data); }
                } else {
                    reject(new Error(`Supabase error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (bodyObj) req.write(payload);
        req.end();
    });
}

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
        req.on('data', chunk => { body += chunk.toString(); });
        
        req.on('end', async () => {
            console.log(`\n[Micro-Server] Received HTTP telemetry from ESP32:`);
            console.log(body);
            
            try {
                const parsedBody = JSON.parse(body);
                
                // 1. Forward payload to Supabase sensor_history
                await supabaseRequest(SUPABASE_PATH, 'POST', parsedBody);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));

                // 2. Check for rotten food logic (e.g., mq4 or gas > threshold)
                // Adjust threshold based on real sensor calibration
                const isRotten = (parsedBody.mq4 && parsedBody.mq4 > 300) || (parsedBody.gas && parsedBody.gas > 300);
                
                if (isRotten) {
                    console.log('[Pusher Beams] Rotten food detected! Broadcasting to "spoiled-food" interest...');
                    await sendPusherNotification(parsedBody.mq4, parsedBody.gas);
                }
            } catch (err) {
                console.error('[Supabase/Telemetry] Error:', err);
                // If response wasn't sent yet
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================================`);
    console.log(`=== APMOB FOOD MONITORING TELEMETRY MICRO-SERVER RUNNING ===`);
    console.log(`=============================================================`);
    console.log(`[Status] Listening on local port: ${PORT}`);
    console.log(`[Info] Web Push Notifications Enabled!`);
    console.log(`=============================================================`);
});
