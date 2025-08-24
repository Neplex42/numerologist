// Minimal serverless-style handler for creating a Systeme.io contact
// Expected env: SYSTEME_IO_API_KEY, SYSTEME_IO_REGION ("eu" or "us")
// POST JSON body: { email, firstName, birthDate, lifePathNumber }

/* eslint-disable no-undef */

const https = require('https');

function postJson(url, apiKey, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const payload = Buffer.from(JSON.stringify(data));

    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
        'X-Api-Key': apiKey
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyStr = Buffer.concat(chunks).toString('utf8');
    const body = JSON.parse(bodyStr || '{}');

    const apiKey = process.env.SYSTEME_IO_API_KEY;
    const region = (process.env.SYSTEME_IO_REGION || 'eu').toLowerCase();
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing SYSTEME_IO_API_KEY' }));
      return;
    }

    // Build payload
    const email = String(body.email || '').trim();
    if (!email) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'email is required' }));
      return;
    }

    const firstName = String(body.firstName || '').trim();

    // 1) Create contact
    const base = region === 'us' ? 'https://api.systeme.io' : 'https://api.systeme.io';
    const createUrl = `${base}/contacts`;

    const createResp = await postJson(createUrl, apiKey, {
      email,
      first_name: firstName || undefined
    });

    // 2) Optionally set custom fields if provided
    const { birthDate, lifePathNumber } = body;
    let extras = {};
    if (birthDate) extras['custom_fields'] = { date_de_naissance: birthDate };
    if (typeof lifePathNumber !== 'undefined') {
      extras['custom_fields'] = {
        ...(extras['custom_fields'] || {}),
        life_path_number: String(lifePathNumber)
      };
    }

    let updateResp = null;
    if (Object.keys(extras).length > 0) {
      const updateUrl = `${base}/contacts/update-by-email`;
      updateResp = await postJson(updateUrl, apiKey, {
        email,
        ...extras
      });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ create: createResp, update: updateResp }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }));
  }
};
