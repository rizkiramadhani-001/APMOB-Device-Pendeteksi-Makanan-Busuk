const https = require('https');

module.exports = async (req, res) => {
  // CORS Headers to allow direct requests from hardware or other devices
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      // Vercel automatically parses JSON bodies into req.body if it's sent as application/json.
      // If it isn't parsed, we parse it manually.
      const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const bodyStr = JSON.stringify(bodyObj);

      const SUPABASE_URL = process.env.SUPABASE_URL || 'hijdrgyysmurhahdavtu.supabase.co';
      const SUPABASE_PATH = '/rest/v1/sensor_history';
      
      // Falls back to your original key if environment variables are not set in the Vercel Dashboard
      const SUPABASE_KEY = process.env.SUPABASE_KEY || 
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
          "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpamRy" +
          "Z3l5c211cmhhaGRhdnR1Iiwicm9sZSI6InNlcnZp" +
          "Y2Vfcm9sZSIsImlhdCI6MTc3NTczMDQwMCwiZXhw" +
          "IjoyMDkxMzA2NDAwfQ.WdtSLpE3WCpt0md9eDtls" +
          "S0Xa3PPGCjqJ3yBfHGhpuM";

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
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      };

      // Perform secure HTTPS Request to forward telemetry payload to Supabase
      return new Promise((resolve) => {
        const supabaseReq = https.request(options, (supabaseRes) => {
          let responseData = '';
          supabaseRes.on('data', d => responseData += d);
          supabaseRes.on('end', () => {
            res.status(supabaseRes.statusCode).send(responseData);
            resolve();
          });
        });

        supabaseReq.on('error', (error) => {
          console.error('[Supabase HTTPS] Forwarding Error:', error);
          res.status(500).json({ error: error.message });
          resolve();
        });

        supabaseReq.write(bodyStr);
        supabaseReq.end();
      });
    } catch (err) {
      res.status(400).json({ error: 'Malformed JSON payload: ' + err.message });
    }
  } else {
    res.status(404).json({ error: 'Endpoint Not Found. Please send a POST request.' });
  }
};
