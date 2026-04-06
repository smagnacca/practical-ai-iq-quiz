// Netlify Function: send-referral.js
// Sends a "friend invite" email via Resend, notifies Scott, and logs referral to Google Sheets
// Env vars needed: RESEND_API_KEY, GOOGLE_SERVICE_ACCOUNT_JSON

const { createSign } = require("crypto");

const SHEET_ID = "1RHtpqWJMbQPhTTBzF2HU5hzg9SISutY_m40UU_vCleE";
const SHEET_TAB = "Referrals";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const NOTIFY_EMAIL = "scott.magnacca1@gmail.com";
const FROM_EMAIL = "Practical AI Skills IQ <hello@salesforlife.ai>";
const QUIZ_URL = "https://practical-ai-skills-iq.netlify.app";

// --- Google JWT auth (no googleapis package needed) ---
function makeJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const sigInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(sigInput);
  const sig = sign.sign(serviceAccount.private_key, "base64url");
  return `${sigInput}.${sig}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = makeJWT(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token: " + JSON.stringify(data));
  return data.access_token;
}

async function appendReferralRow(token, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}!A1:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Sheets append failed: " + err);
  }
  return res.json();
}

async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Resend failed: " + err);
  }
  return res.json();
}

function friendInviteEmail({ referrerName, referrerScore, friendName }) {
  return {
    subject: `${referrerName} thinks you should take this AI Skills quiz`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">
  <div style="background:#006644;padding:32px 24px;text-align:center">
    <h1 style="color:#FFFFFF;font-size:22px;margin:0">Practical AI Skills IQ Quiz</h1>
    <p style="color:rgba(255,255,255,.75);font-size:14px;margin:8px 0 0">A personal invitation from ${referrerName}</p>
  </div>
  <div style="padding:32px 24px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px">Hi ${friendName},</p>
    <p style="font-size:15px;color:#4A5568;line-height:1.7;margin-bottom:20px">
      Your colleague <strong>${referrerName}</strong> just completed the <strong>Practical AI Skills IQ Quiz</strong>
      and scored <strong style="color:#006644">${referrerScore}%</strong> — and they wanted you to know about it.
    </p>
    <p style="font-size:15px;color:#4A5568;line-height:1.7;margin-bottom:24px">
      This isn't a generic AI hype test. It measures real, practical skills that separate
      professionals who use AI to get ahead from those falling behind. The quiz takes about
      8 minutes and you'll immediately see where you stand — by category, vs. your industry,
      and what to do about any gaps.
    </p>
    <div style="background:#F0FFF4;border:1px solid #C6F6D5;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px">
      <p style="font-size:13px;color:#276749;margin:0 0 4px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px">
        ${referrerName} scored
      </p>
      <div style="font-size:42px;font-weight:bold;color:#006644;line-height:1">${referrerScore}%</div>
      <p style="font-size:12px;color:#718096;margin:6px 0 0">Can you beat them?</p>
    </div>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${QUIZ_URL}" style="display:inline-block;background:#C9A84C;color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 36px;border-radius:6px;letter-spacing:.3px">
        Take the Quiz Free →
      </a>
    </div>
    <p style="font-size:12px;color:#A0AEC0;line-height:1.6;text-align:center">
      Takes 8 minutes · No signup required · Free instant results<br/>
      Practical AI Skills IQ · <a href="${QUIZ_URL}" style="color:#A0AEC0">${QUIZ_URL}</a>
    </p>
  </div>
</div>
</body></html>`,
  };
}

function notificationEmail({ referrerName, referrerEmail, referrerScore, friendName, friendEmail, timestamp }) {
  return {
    subject: `🔗 New Referral: ${referrerName} → ${friendName}`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:500px;margin:0 auto;background:#FFFFFF;padding:24px">
  <h2 style="color:#006644;margin-top:0">New Referral Sent 🎉</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;color:#718096;width:140px">Referrer</td><td style="padding:8px 0;color:#2D3748;font-weight:bold">${referrerName} (${referrerEmail})</td></tr>
    <tr><td style="padding:8px 0;color:#718096">Their Score</td><td style="padding:8px 0;color:#006644;font-weight:bold">${referrerScore}%</td></tr>
    <tr><td style="padding:8px 0;color:#718096">Friend Name</td><td style="padding:8px 0;color:#2D3748;font-weight:bold">${friendName}</td></tr>
    <tr><td style="padding:8px 0;color:#718096">Friend Email</td><td style="padding:8px 0;color:#2D3748">${friendEmail}</td></tr>
    <tr><td style="padding:8px 0;color:#718096">Sent At</td><td style="padding:8px 0;color:#2D3748">${timestamp}</td></tr>
  </table>
  <p style="font-size:12px;color:#A0AEC0;margin-top:20px">Logged to Google Sheets → Referrals tab</p>
</div>
</body></html>`,
  };
}

// --- Main handler ---
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body || "{}");
    const { referrerName, referrerEmail, referrerScore, friendName, friendEmail } = body;

    if (!referrerEmail || !friendEmail || !friendName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
    }

    const timestamp = new Date().toISOString();

    // 1. Send invite email to friend
    const invite = friendInviteEmail({ referrerName: referrerName || "A colleague", referrerScore: referrerScore || "—", friendName });
    await sendEmail(friendEmail, invite.subject, invite.html);

    // 2. Notify Scott
    const notif = notificationEmail({ referrerName: referrerName || "Unknown", referrerEmail, referrerScore: referrerScore || "—", friendName, friendEmail, timestamp });
    await sendEmail(NOTIFY_EMAIL, notif.subject, notif.html);

    // 3. Log to Google Sheets (Referrals tab)
    try {
      const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const token = await getAccessToken(sa);
      await appendReferralRow(token, [timestamp, referrerName || "", referrerEmail, referrerScore || "", friendName, friendEmail, "sent"]);
    } catch (sheetsErr) {
      // Non-fatal — email already sent, just log the sheets error
      console.error("Sheets logging failed (non-fatal):", sheetsErr.message);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error("send-referral error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to send referral", details: err.message }) };
  }
};
