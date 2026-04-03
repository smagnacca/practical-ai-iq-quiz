// Netlify Scheduled Function: check-followups.js
// Runs every 30 minutes. Reads Google Sheets for leads that need follow-up emails.
// Columns expected in AI_IQ_Quiz_Leads tab:
//   A: Timestamp, B: FirstName, C: Email, D: Industry, E: Score%, F: Correct/Total,
//   G: Time, H-S: Per-question, T: Categories, U: Paid (TRUE/FALSE), V: FollowUp1Sent, W: FollowUp2Sent
// Env vars: GOOGLE_SERVICE_ACCOUNT_JSON, RESEND_API_KEY

const { createSign } = require('crypto');

const SHEET_ID = '1RHtpqWJMbQPhTTBzF2HU5hzg9SISutY_m40UU_vCleE';
const SHEET_TAB = 'AI_IQ_Quiz_Leads';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// ──── Google JWT Auth (reused from submit-lead) ────
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
  if (!data.access_token) throw new Error('Auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function getSheetData(token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}!A2:X?majorDimension=ROWS`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Sheet read failed: ' + await res.text());
  const data = await res.json();
  return data.values || [];
}

async function updateCell(token, cell, value) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}!${cell}?valueInputOption=USER_ENTERED`;
  await fetch(url, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[value]] }),
  });
}

// ──── Email sender (Resend API) ────
async function sendViaResend(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Practical AI Skills IQ <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return res.json();
}

async function sendFollowUp(email, type, data) {
  // Dynamically require the email templates from send-email module
  // For simplicity, inline the key email content here
  const { firstName, score, industry, cats } = data;
  const siteUrl = process.env.URL || 'https://practical-ai-skills-iq.netlify.app';
  const checkoutUrl = `${siteUrl}/?retarget=1&name=${encodeURIComponent(firstName)}&email=${encodeURIComponent(email)}`;

  let subject, html;
  if (type === 'followup1') {
    subject = `${firstName}, your AI score of ${score}% — here's what it means`;
    html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#006644;padding:28px 24px;text-align:center"><h1 style="color:#fff;font-size:20px;margin:0">Your AI Skills Assessment</h1></div>
      <div style="padding:32px 24px">
        <p style="font-size:16px;color:#2D3748">Dear ${firstName},</p>
        <p style="font-size:14px;color:#4A5568;line-height:1.6">Earlier today you took the Practical AI Skills IQ Quiz and scored <strong>${score}%</strong>.</p>
        <p style="font-size:14px;color:#4A5568;line-height:1.6">Your <strong>personalized AI Skills Report</strong> reveals exactly which of your 6 skill categories are strengths vs. critical gaps, how you compare to other ${industry || 'professional'}s, and a tailored action plan.</p>
        <div style="background:#006644;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
          <p style="color:rgba(255,255,255,.8);font-size:13px;margin:0 0 4px;text-decoration:line-through">$9.99</p>
          <p style="color:#fff;font-size:24px;font-weight:bold;margin:0 0 12px">Just $1.00</p>
          <a href="${checkoutUrl}" style="display:inline-block;background:#EEAF00;color:#1B4332;font-weight:bold;padding:14px 36px;border-radius:8px;text-decoration:none">Get My Full Report — $1 →</a>
        </div>
      </div>
    </div>`;
  } else if (type === 'followup2') {
    subject = `Last chance, ${firstName} — $1 report offer expires tonight`;
    html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#005172;padding:28px 24px;text-align:center"><h1 style="color:#fff;font-size:20px;margin:0">⏰ Your $1 Offer Expires Soon</h1></div>
      <div style="padding:32px 24px">
        <p style="font-size:16px;color:#2D3748">Dear ${firstName},</p>
        <p style="font-size:14px;color:#4A5568;line-height:1.6">You scored <strong>${score}%</strong> on the AI Skills IQ Quiz — which means there are specific gaps holding you back from the top tier.</p>
        <div style="background:#FAFAF7;border-left:4px solid #006644;padding:16px;margin:20px 0;font-size:13px;color:#4A5568;line-height:1.6;font-style:italic">
          "The report showed me I was spending time on the wrong skills. Two weeks later, I'd automated 6 hours of weekly work."<br/><strong style="font-style:normal">— Sarah K., Marketing Director</strong>
        </div>
        <div style="border:2px dashed #C0392B;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
          <p style="color:#C0392B;font-weight:bold;margin:0 0 12px">This $1 offer expires at midnight</p>
          <a href="${checkoutUrl}" style="display:inline-block;background:#C0392B;color:#fff;font-weight:bold;padding:14px 36px;border-radius:8px;text-decoration:none">Get My Report Before It's $9.99 →</a>
        </div>
      </div>
    </div>`;
  } else if (type === 'followup3') {
    // Insight-focused email (modeled on myIQ pattern) — shows what the report reveals
    const categoryDescriptions = {
      "AI Skills Gap Awareness": "how accurately you spot where AI can add value in your daily work",
      "ROI-First AI": "how well you quantify the dollar impact of AI investments",
      "Decision Intelligence": "how effectively you blend AI recommendations with human judgment",
      "Prompting as Power Skill": "how precisely you communicate with AI to get expert-level output",
      "AI Workflow Integration": "how strategically you connect AI into existing tools and processes",
      "AI Communication & Persuasion": "how persuasively you build trust and make the case for AI"
    };
    let categoryBullets = '';
    if (cats && typeof cats === 'object') {
      Object.entries(cats).forEach(([cat, d]) => {
        const pct = Math.round(d.correct / d.total * 100);
        const desc = categoryDescriptions[cat] || 'a key AI competency area';
        categoryBullets += `<li style="margin-bottom:12px"><strong>${cat}</strong>: ${desc}. <span style="color:${pct >= 80 ? '#27AE60' : pct >= 50 ? '#EEAF00' : '#C0392B'};font-weight:600">You scored ${pct}%</span></li>`;
      });
    } else {
      Object.entries(categoryDescriptions).forEach(([cat, desc]) => {
        categoryBullets += `<li style="margin-bottom:12px"><strong>${cat}</strong>: ${desc}</li>`;
      });
    }
    subject = `${firstName}, here's what your AI score actually reveals`;
    html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
      <div style="background:linear-gradient(135deg,#006644,#005172);padding:32px 24px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#fff;font-family:Georgia,serif">Practical AI Skills IQ</div>
      </div>
      <div style="padding:36px 32px">
        <p style="font-size:16px;color:#2D3748;margin-bottom:20px">Hi ${firstName},</p>
        <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px">Your AI Skills score of <strong>${score}%</strong> is unique. But the real win is knowing your <em>specific</em> skill profile — where you're strong and where one gap could be quietly costing you.</p>
        <p style="font-size:14px;color:#2D3748;line-height:1.6;margin-bottom:12px"><strong>Your report breaks your results into 6 practical AI skill areas:</strong></p>
        <ul style="font-size:14px;color:#4A5568;line-height:1.7;padding-left:20px;margin-bottom:28px">${categoryBullets}</ul>
        <div style="text-align:center;margin-bottom:28px">
          <a href="${checkoutUrl}" style="display:inline-block;background:#006644;color:#fff;font-weight:bold;font-size:16px;padding:16px 44px;border-radius:8px;text-decoration:none">Unlock My AI Skills Report</a>
        </div>
        <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:16px">Plus, you'll get a downloadable PDF with your personalized action plan and industry benchmarks.</p>
        <p style="font-size:14px;color:#4A5568;line-height:1.7">When you see which AI skill is strongest (and which one holds you back), everything gets clearer. You can focus on your strengths and start closing the gaps that matter most.</p>
        <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-top:24px;margin-bottom:4px">Best regards,</p>
        <p style="font-size:14px;color:#2D3748;font-weight:600;margin:0">The Practical AI Skills IQ Team</p>
      </div>
      <div style="background:#F7FAFC;padding:20px 24px;text-align:center;border-top:1px solid #E2E8F0">
        <p style="font-size:11px;color:#A0AEC0;margin:0">© 2026 Practical AI Skills IQ. All rights reserved. <a href="#" style="color:#A0AEC0;text-decoration:underline">Unsubscribe</a></p>
      </div>
    </div>`;
  }

  await sendViaResend(email, subject, html);
}

// ──── MAIN HANDLER (Scheduled) ────
exports.handler = async () => {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.RESEND_API_KEY) {
      console.log('Missing env vars — skipping follow-up check');
      return { statusCode: 200, body: 'Skipped: missing config' };
    }

    const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const token = await getAccessToken(sa);
    const rows = await getSheetData(token);
    const now = Date.now();
    let sent = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const timestamp = row[0]; // ISO timestamp
      const firstName = row[1] || '';
      const email = row[2] || '';
      const industry = row[3] || '';
      const score = parseInt(row[4]) || 0;
      const catScoresRaw = row[19] || ''; // Column T: category scores string
      const paid = (row[20] || '').toUpperCase() === 'TRUE';
      const fu1Sent = (row[21] || '').toUpperCase() === 'TRUE';
      const fu2Sent = (row[22] || '').toUpperCase() === 'TRUE';
      const fu3Sent = (row[23] || '').toUpperCase() === 'TRUE';

      if (!email || paid) continue;

      const quizTime = new Date(timestamp).getTime();
      if (isNaN(quizTime)) continue;

      const hoursSince = (now - quizTime) / (1000 * 60 * 60);
      const rowNum = i + 2; // Sheet rows are 1-indexed + header

      // Parse category scores from "Cat Name: 50% | Cat Name: 100%" format
      let cats = null;
      if (catScoresRaw) {
        cats = {};
        catScoresRaw.split(' | ').forEach(s => {
          const match = s.match(/^(.+?):\s*(\d+)%$/);
          if (match) {
            const pct = parseInt(match[2]);
            // Reconstruct correct/total from percentage (2 questions per category)
            cats[match[1]] = { correct: Math.round(pct / 50), total: 2 };
          }
        });
      }

      const data = { firstName, score, industry, cats };

      // Follow-up 1: Send after 2 hours (price teaser)
      if (hoursSince >= 2 && !fu1Sent) {
        try {
          await sendFollowUp(email, 'followup1', data);
          await updateCell(token, `V${rowNum}`, 'TRUE');
          sent++;
          console.log(`Follow-up 1 sent to ${email}`);
        } catch (e) { console.error(`FU1 failed for ${email}:`, e.message); }
      }

      // Follow-up 2: Send after 4 hours (urgency/scarcity)
      if (hoursSince >= 4 && !fu2Sent) {
        try {
          await sendFollowUp(email, 'followup2', data);
          await updateCell(token, `W${rowNum}`, 'TRUE');
          sent++;
          console.log(`Follow-up 2 sent to ${email}`);
        } catch (e) { console.error(`FU2 failed for ${email}:`, e.message); }
      }

      // Follow-up 3: Send after 6 hours (insight-focused, myIQ style)
      if (hoursSince >= 6 && !fu3Sent) {
        try {
          await sendFollowUp(email, 'followup3', data);
          await updateCell(token, `X${rowNum}`, 'TRUE');
          sent++;
          console.log(`Follow-up 3 sent to ${email}`);
        } catch (e) { console.error(`FU3 failed for ${email}:`, e.message); }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ checked: rows.length, sent }) };
  } catch (err) {
    console.error('check-followups error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
