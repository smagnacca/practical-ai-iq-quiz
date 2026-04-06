// Netlify Function: mark-paid.js
// Marks a lead as "paid" in Google Sheets (column U) to prevent follow-up emails
// Env vars: GOOGLE_SERVICE_ACCOUNT_JSON

const { createSign } = require('crypto');

const SHEET_ID = '1RHtpqWJMbQPhTTBzF2HU5hzg9SISutY_m40UU_vCleE';
const SHEET_TAB = 'AI_IQ_Quiz_Leads';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function makeJWT(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email, scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })).toString('base64url');
  const sig = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(sa.private_key, 'base64url');
  return `${header}.${payload}.${sig}`;
}

async function getAccessToken(sa) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${makeJWT(sa)}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Auth failed');
  return data.access_token;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Not configured' }) };

    const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const token = await getAccessToken(sa);

    // Read column C (emails) to find the row
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}!C2:C?majorDimension=COLUMNS`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const emails = (data.values && data.values[0]) || [];

    const rowIdx = emails.findIndex(e => e.toLowerCase() === email.toLowerCase());
    if (rowIdx === -1) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Lead not found' }) };

    const rowNum = rowIdx + 2; // 1-indexed + header row
    // Update column U to TRUE
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}!U${rowNum}?valueInputOption=USER_ENTERED`;
    await fetch(updateUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [['TRUE']] }),
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, row: rowNum }) };
  } catch (err) {
    console.error('mark-paid error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
