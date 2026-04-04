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
      from: 'Practical AI Skills IQ <hello@salesforlife.ai>',
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
  const { firstName, score, industry, cats } = data;
  const siteUrl = process.env.URL || 'https://practical-ai-skills-iq.netlify.app';
  const checkoutUrl = `${siteUrl}/?retarget=1&name=${encodeURIComponent(firstName)}&email=${encodeURIComponent(email)}`;

  // Helper: find best and worst categories
  let topCat = '', topPct = 0, lowCat = '', lowPct = 100;
  if (cats && typeof cats === 'object') {
    Object.entries(cats).forEach(([cat, d]) => {
      const pct = Math.round(d.correct / d.total * 100);
      if (pct > topPct) { topPct = pct; topCat = cat; }
      if (pct < lowPct) { lowPct = pct; lowCat = cat; }
    });
  }

  let subject, html;

  if (type === 'followup1') {
    // ── EMAIL 1: Score Teaser + $1 CTA (personalized by strongest category) ──
    const hasTopCat = topCat && topPct >= 50;
    subject = hasTopCat
      ? `${firstName}, you scored ${topPct}% in ${topCat} — but one skill area may be holding you back`
      : `${firstName}, your AI score of ${score}% — here's what it means`;
    const headerTitle = hasTopCat ? `You Excelled in ${topCat}` : `Your AI Skills Assessment`;
    const headerSub = hasTopCat ? 'But your full AI Skills profile tells a bigger story' : `Personalized results for ${firstName}`;

    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">
  <div style="background:#006644;padding:28px 24px;text-align:center">
    <h1 style="color:#fff;font-size:20px;margin:0;font-family:Arial,sans-serif">${headerTitle}</h1>
    <p style="color:rgba(255,255,255,.6);font-size:13px;margin:8px 0 0;font-family:Arial,sans-serif">${headerSub}</p>
  </div>
  <div style="padding:32px 24px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px;font-family:Arial,sans-serif">Dear ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px;font-family:Arial,sans-serif">
      ${hasTopCat
        ? `You scored <span style="color:#27AE60;font-weight:800;font-size:16px">${topPct}% in ${topCat}</span> on the Practical AI Skills IQ Quiz — that's exceptional. But your overall score of <strong style="color:#006644;font-size:16px">${score}%</strong> tells a more nuanced story.`
        : `You took the Practical AI Skills IQ Quiz and scored <strong style="color:#006644;font-size:16px">${score}%</strong> — but that number is just the surface.`
      }
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px;font-family:Arial,sans-serif">
      Your score is just the starting point. Your <strong style="color:#005172;font-size:15px">Personalized AI Skills Report</strong> reveals:
    </p>
    <ul style="font-size:14px;color:#4A5568;line-height:2;padding-left:20px;margin-bottom:20px;font-family:Arial,sans-serif">
      <li>Exactly which of your 6 skill categories are <strong style="color:#27AE60">strengths</strong> vs. <strong style="color:#C0392B">critical gaps</strong></li>
      <li><strong style="color:#005172">How you compare</strong> to other ${industry || 'professional'}s in your industry</li>
      <li>A <strong style="color:#006644">week-by-week action plan</strong> tailored to your specific results</li>
      <li>The categories with the <strong style="color:#C9A84C">highest career ROI</strong> for you personally</li>
    </ul>
    <div style="background:#006644;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
      <p style="color:rgba(255,255,255,.8);font-size:14px;margin:0 0 6px;text-decoration:line-through;font-family:Arial,sans-serif">$9.99</p>
      <p style="color:#EEAF00;font-size:28px;font-weight:900;margin:0 0 4px;font-family:Georgia,serif">Just $1.00</p>
      <p style="color:rgba(255,255,255,.5);font-size:12px;margin:0 0 16px;font-family:Arial,sans-serif">90% off — limited time offer</p>
      <a href="${checkoutUrl}" style="display:inline-block;background:#EEAF00;color:#1B4332;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;border:2px solid #C9A84C;font-family:Arial,sans-serif">Get My Full Report — $1 →</a>
    </div>
    <p style="font-size:12px;color:#A0AEC0;text-align:center;font-family:Arial,sans-serif">
      PwC reports a <strong style="color:#718096">56% wage premium</strong> for AI-skilled professionals. Your report shows exactly where to invest.
    </p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;font-size:11px;color:#A0AEC0;font-family:Arial,sans-serif">
    © 2026 Practical AI Skills IQ. All rights reserved.
  </div>
</div>
</body></html>`;

  } else if (type === 'followup2') {
    // ── EMAIL 2: Urgency/Scarcity + Gap-Contrast Hook ──
    const hasGapData = topCat && lowCat && topPct > lowPct;
    const gapSize = topPct - lowPct;
    subject = hasGapData
      ? `${firstName}, your ${lowCat.split(' ').slice(0,3).join(' ')} score is ${gapSize} points behind your strongest skill`
      : `Last chance, ${firstName} — $1 report offer expires tonight`;

    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">
  <div style="background:#005172;padding:28px 24px;text-align:center">
    <h1 style="color:#fff;font-size:20px;margin:0;font-family:Arial,sans-serif">⏰ One Skill Gap Is Costing You</h1>
    <p style="color:rgba(255,255,255,.6);font-size:13px;margin:8px 0 0;font-family:Arial,sans-serif">And the $1 offer to see exactly which one expires soon</p>
  </div>
  <div style="padding:32px 24px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px;font-family:Arial,sans-serif">Dear ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px;font-family:Arial,sans-serif">
      ${hasGapData
        ? `Something stood out in your quiz results: you scored <span style="color:#27AE60;font-weight:800">${topPct}%</span> in ${topCat}, but <span style="color:#C0392B;font-weight:800">${lowPct}%</span> in ${lowCat}. That <strong style="color:#C0392B">${gapSize}-point gap</strong> between your best and worst skill could be quietly undermining your strongest areas.`
        : `You scored <strong style="color:#006644">${score}%</strong> on the AI Skills IQ Quiz — which means there are specific, identifiable gaps holding you back from the top tier.`
      }
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px;font-family:Arial,sans-serif">
      Your full report shows exactly <strong style="color:#006644">where this gap is costing you</strong> and the <strong style="color:#005172">specific steps to close it</strong> — before it holds you back further.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px;font-family:Arial,sans-serif">
      <strong>Here's what <span style="color:#006644">2,847 professionals</span> who got their report told us:</strong>
    </p>
    <div style="background:#FAFAF7;border-left:4px solid #006644;padding:16px;margin-bottom:20px;font-size:13px;color:#4A5568;line-height:1.6;font-style:italic;font-family:Arial,sans-serif;border-radius:0 8px 8px 0">
      "I thought I was good with AI until I saw my <strong style="font-style:normal;color:#006644">category breakdown</strong>. The report showed me I was spending time on the <strong style="font-style:normal;color:#C0392B">wrong skills</strong>. Two weeks later, I'd <strong style="font-style:normal;color:#006644">automated 6 hours of weekly work</strong> I didn't even realize was automatable."
      <br/><strong style="font-style:normal;color:#2D3748">— Sarah K., Marketing Director</strong>
    </div>
    <div style="border:2px dashed #C0392B;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
      <p style="color:#C0392B;font-weight:bold;font-size:15px;margin:0 0 4px;font-family:Arial,sans-serif">⚡ This $1 offer expires at midnight</p>
      <p style="color:#718096;font-size:12px;margin:0 0 16px;font-family:Arial,sans-serif">After that, the report returns to <strong style="color:#C0392B">$9.99</strong></p>
      <a href="${checkoutUrl}" style="display:inline-block;background:#C0392B;color:#fff;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;border:2px solid #A93226;font-family:Arial,sans-serif">Get My Report Before It's $9.99 →</a>
    </div>
    <p style="font-size:12px;color:#A0AEC0;text-align:center;font-family:Arial,sans-serif">
      <strong style="color:#718096">87% of quiz takers</strong> who unlocked their report said it changed how they approach AI at work.
    </p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;font-size:11px;color:#A0AEC0;font-family:Arial,sans-serif">
    © 2026 Practical AI Skills IQ. All rights reserved.<br/><a href="#" style="color:#A0AEC0">Unsubscribe</a>
  </div>
</div>
</body></html>`;

  } else if (type === 'followup3') {
    // ── EMAIL 3: myIQ-Style Full Breakdown with Visual Category Cards ──
    const categoryDescriptions = {
      "AI Skills Gap Awareness": "how accurately you spot where AI can add value",
      "ROI-First AI": "how well you quantify the dollar impact of AI",
      "Decision Intelligence": "how effectively you blend AI with human judgment",
      "Prompting as Power Skill": "how precisely you communicate with AI",
      "AI Workflow Integration": "how strategically you connect AI into processes",
      "AI Communication & Persuasion": "how persuasively you build trust for AI adoption"
    };
    let categoryCards = '';
    let strengthCount = 0, gapCount = 0;
    if (cats && typeof cats === 'object') {
      Object.entries(cats).forEach(([cat, d]) => {
        const pct = Math.round(d.correct / d.total * 100);
        const desc = categoryDescriptions[cat] || 'a key AI competency area';
        const emoji = pct >= 80 ? '⭐' : pct >= 50 ? '⚡' : '🎯';
        const color = pct >= 80 ? '#27AE60' : pct >= 50 ? '#EEAF00' : '#C0392B';
        const bgColor = pct >= 80 ? 'rgba(39,174,96,.06)' : pct >= 50 ? 'rgba(238,175,0,.06)' : 'rgba(192,57,43,.06)';
        if (pct >= 80) strengthCount++; else gapCount++;
        categoryCards += `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:6px;border-radius:8px;background:${bgColor};border-left:3px solid ${color}">
              <span style="font-size:18px">${emoji}</span>
              <div style="flex:1"><strong style="font-size:13px;color:#2D3748">${cat}</strong><br/><span style="font-size:12px;color:#718096">${desc}</span></div>
              <span style="font-weight:800;font-size:16px;color:${color}">${pct}%</span>
            </div>`;
      });
    } else {
      Object.entries(categoryDescriptions).forEach(([cat, desc]) => {
        categoryCards += `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:6px;border-radius:8px;background:rgba(0,0,0,.02);border-left:3px solid #EEAF00">
              <span style="font-size:18px">⚡</span>
              <div style="flex:1"><strong style="font-size:13px;color:#2D3748">${cat}</strong><br/><span style="font-size:12px;color:#718096">${desc}</span></div>
            </div>`;
      });
    }
    subject = gapCount > 0
      ? `${firstName}, ${gapCount} of your 6 AI skill areas need attention — here's the full picture`
      : `${firstName}, here's what your AI score actually reveals`;

    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#006644;padding:32px 24px;text-align:center">
    <div style="font-size:28px;font-weight:900;color:#fff;font-family:Georgia,serif;letter-spacing:-0.5px">Practical AI Skills IQ</div>
    <p style="color:rgba(255,255,255,.55);font-size:12px;margin:8px 0 0;font-family:Arial,sans-serif;letter-spacing:.5px">YOUR COMPLETE AI SKILL PROFILE</p>
  </div>
  <div style="padding:36px 32px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:20px;font-family:Arial,sans-serif">Hi ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px;font-family:Arial,sans-serif">
      We analyzed your quiz results across all 6 AI skill categories, and the pattern is clear: ${strengthCount > 0 ? `<strong style="color:#27AE60">${strengthCount} area${strengthCount > 1 ? 's are' : ' is a'} genuine strength${strengthCount > 1 ? 's' : ''}</strong>` : ''} ${gapCount > 0 ? `${strengthCount > 0 ? 'but ' : ''}<strong style="color:#C0392B">${gapCount} need${gapCount === 1 ? 's' : ''} attention</strong>` : ''}. That imbalance is more common than you'd think, and it's exactly what your personalized report is designed to fix.
    </p>
    <p style="font-size:14px;color:#2D3748;line-height:1.6;margin-bottom:12px;font-family:Arial,sans-serif">
      <strong>Your report breaks your results into 6 practical AI skill areas:</strong>
    </p>
    <div style="padding-left:4px;margin-bottom:28px;font-family:Arial,sans-serif">
      ${categoryCards}
    </div>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${checkoutUrl}" style="display:inline-block;background:#006644;color:#fff;font-weight:bold;font-size:16px;padding:16px 44px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;border:3px solid #C9A84C;font-family:Arial,sans-serif">Unlock My AI Skills Report</a>
    </div>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:16px;font-family:Arial,sans-serif">
      Plus, you'll get a <strong style="color:#006644">downloadable PDF</strong> with your personalized action plan and <strong style="color:#005172">industry benchmarks</strong>.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;font-family:Arial,sans-serif">
      When you see which AI skill is <strong style="color:#27AE60">strongest</strong> (and which one <strong style="color:#C0392B">holds you back</strong>), everything gets clearer.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-top:24px;margin-bottom:4px;font-family:Arial,sans-serif">Best regards,</p>
    <p style="font-size:14px;color:#2D3748;font-weight:600;margin:0;font-family:Arial,sans-serif">The Practical AI Skills IQ Team</p>
  </div>
  <div style="background:#F7FAFC;padding:20px 24px;text-align:center;border-top:1px solid #E2E8F0">
    <p style="font-size:11px;color:#A0AEC0;margin:0;font-family:Arial,sans-serif">© 2026 Practical AI Skills IQ. All rights reserved. <a href="#" style="color:#A0AEC0;text-decoration:underline">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;
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
