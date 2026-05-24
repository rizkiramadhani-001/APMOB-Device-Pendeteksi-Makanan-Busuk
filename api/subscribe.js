const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const subscription = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      const SUPABASE_URL = process.env.SUPABASE_URL || 'hijdrgyysmurhahdavtu.supabase.co';
      const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

      const payload = JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      });

      const options = {
        hostname: SUPABASE_URL,
        port: 443,
        path: '/rest/v1/push_subscriptions?on_conflict=endpoint',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      return new Promise((resolve) => {
        const supabaseReq = https.request(options, (supabaseRes) => {
          let responseData = '';
          supabaseRes.on('data', d => responseData += d);
          supabaseRes.on('end', () => {
            if (supabaseRes.statusCode >= 200 && supabaseRes.statusCode < 300) {
              res.status(201).json({ success: true });
            } else {
              res.status(supabaseRes.statusCode).json({ error: responseData });
            }
            resolve();
          });
        });

        supabaseReq.on('error', (error) => {
          res.status(500).json({ error: error.message });
          resolve();
        });

        supabaseReq.write(payload);
        supabaseReq.end();
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
};
