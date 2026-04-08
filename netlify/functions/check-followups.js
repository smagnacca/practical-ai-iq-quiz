// Netlify Scheduled Function: check-followups.js
// Runs every 30 minutes. Reads Google Sheets for leads that need follow-up emails.
// Columns expected in AI_IQ_Quiz_Leads tab:
//   A: Timestamp, B: FirstName, C: Email, D: Industry, E: Score%, F: Correct/Total,
//   G: Time, H-S: Per-question, T: Categories, U: Paid (TRUE/FALSE), V: FollowUp1Sent, W: FollowUp2Sent, X: FollowUp3Sent, Y: FollowUp4Sent, Z: FollowUp5Sent, AA: FollowUp6Sent
// Email schedule: #1 after 2h, #2 after 4h, #3 after 6h, #4 after 8h, #5 after 24h, #6 after 60h (all to non-payers only)
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
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}!A2:AA?majorDimension=ROWS`;
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
  // Build cats compact string: "Cat Name:pct|Cat2:pct|..."
  let catsCompact = '';
  if (cats && typeof cats === 'object') {
    catsCompact = Object.entries(cats).map(([cat, d]) => {
      const pct = Math.round(d.correct / d.total * 100);
      return `${cat}:${pct}`;
    }).join('|');
  }
  // Base64 encode cats so special chars don't break URL
  const catsB64 = Buffer.from(catsCompact).toString('base64');
  // action=pay sends user directly to results+upsell, bypassing gate form
  const checkoutUrl = `${siteUrl}/?retarget=1&action=pay&name=${encodeURIComponent(firstName)}&email=${encodeURIComponent(email)}&score=${score}&industry=${encodeURIComponent(industry)}&cats=${encodeURIComponent(catsB64)}`;

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
  } else if (type === 'followup4') {
    // ── EMAIL 4: Rarity/Curiosity — "Your answer to question #X was fascinating" ──
    let topCat4 = '', topPct4 = 0, lowCat4 = '';
    if (cats && typeof cats === 'object') {
      Object.entries(cats).forEach(([cat, d]) => {
        const pct = Math.round(d.correct / d.total * 100);
        if (pct > topPct4) { topPct4 = pct; topCat4 = cat; }
      });
    }

    // Mock hard question data
    const hardQuestions = [
      { num: 8,  topic: 'AI governance frameworks',       successRate: 9  },
      { num: 12, topic: 'prompt optimization strategies', successRate: 11 },
      { num: 14, topic: 'multi-model orchestration',      successRate: 8  },
      { num: 6,  topic: 'ROI calculation for AI projects',successRate: 13 },
      { num: 10, topic: 'responsible AI implementation',  successRate: 10 },
    ];
    const q4 = hardQuestions[Math.floor(Math.random() * hardQuestions.length)];
    const selectedQ4 = q4.num, questionTopic4 = q4.topic, successRate4 = q4.successRate;

    let percentile4 = 'top 12%';
    if (topPct4 >= 90) percentile4 = 'top 5%';
    else if (topPct4 >= 80) percentile4 = 'top 10%';
    else if (topPct4 >= 70) percentile4 = 'top 18%';
    else if (topPct4 >= 60) percentile4 = 'top 25%';

    subject = `Your answer to question #${selectedQ4} was fascinating`;
    html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#006644 0%,#004d33 100%);padding:32px 24px;text-align:center">
    <h1 style="color:#FFFFFF;font-size:20px;margin:0;font-family:Arial,sans-serif">You Solved a Rare Question</h1>
    <p style="color:rgba(255,255,255,.65);font-size:13px;margin:8px 0 0;font-family:Arial,sans-serif">Only ${successRate4}% of quiz takers got this right</p>
  </div>
  <div style="padding:36px 32px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px;font-family:Arial,sans-serif">Hi ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px;font-family:Arial,sans-serif">
      Question #${selectedQ4} on your assessment — the one about <strong>${questionTopic4}</strong> — has only a <strong style="color:#006644;font-size:15px">${successRate4}%</strong> success rate among everyone who has taken the Practical AI Skills IQ quiz.
    </p>
    <div style="background:linear-gradient(135deg,rgba(0,102,68,.05),rgba(201,168,76,.05));border-left:4px solid #C9A84C;padding:20px;margin-bottom:24px;border-radius:6px">
      <p style="font-size:16px;color:#006644;font-weight:700;margin:0 0 12px;font-family:Arial,sans-serif">You solved it correctly.</p>
      <p style="font-size:14px;color:#4A5568;line-height:1.6;margin:0;font-family:Arial,sans-serif">You might have a very rare AI aptitude profile, because you:</p>
    </div>
    <ul style="font-size:14px;color:#4A5568;line-height:1.8;margin-bottom:24px;padding-left:20px;font-family:Arial,sans-serif">
      <li><strong style="color:#006644">Understand ${topCat4} faster than most people</strong> — You are in the <strong>${percentile4}</strong> for ${topCat4}, which means you see patterns and connections others miss</li>
      <li><strong style="color:#006644">Naturally know how to apply AI concepts to real work</strong> — You do not just know the theory; you can translate it into strategy</li>
      <li><strong style="color:#006644">Can spot AI opportunities others overlook</strong> — This exact type of thinking is what separates AI leaders from followers</li>
    </ul>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:24px;font-family:Arial,sans-serif">
      In <strong>${industry}</strong>, this skill is gold. ${topCat4} thinking is what separates AI strategists from technicians. Your complete rare profile is waiting. <strong style="color:#006644">Claim it now</strong> to see exactly how your AI skills position you against industry benchmarks and what your biggest opportunity is.
    </p>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${checkoutUrl}" style="display:inline-block;background:#006644;color:#FFFFFF;font-weight:bold;font-size:16px;padding:16px 48px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;border:3px solid #C9A84C;font-family:Arial,sans-serif">Claim My AI Skills Report — $1</a>
    </div>
    <div style="background:#F9F5F0;border-radius:8px;padding:18px;margin-bottom:24px">
      <p style="font-size:13px;color:#2D3748;font-weight:700;margin:0 0 10px;font-family:Arial,sans-serif">Your complete analysis will show you:</p>
      <ul style="font-size:13px;color:#4A5568;line-height:1.8;margin:0;padding-left:18px;font-family:Arial,sans-serif">
        <li>Exactly which AI skill is your hidden strength</li>
        <li>How your profile compares to 50,000+ professionals</li>
        <li>The #1 skill gap holding you back from AI leadership</li>
        <li>A personalized 4-day action plan to close that gap</li>
      </ul>
    </div>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:24px;font-family:Arial,sans-serif">Some insights are worth knowing. And some are worth acting on.</p>
    <p style="font-size:14px;color:#2D3748;margin-bottom:4px;font-family:Arial,sans-serif">Best regards,</p>
    <p style="font-size:14px;color:#2D3748;font-weight:700;margin:0 0 20px;font-family:Arial,sans-serif">Scott Magnacca<br/><span style="font-weight:400;color:#718096;font-size:12px">Practical AI Skills IQ</span></p>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0"/>
    <p style="font-size:13px;color:#718096;line-height:1.7;font-family:Arial,sans-serif;margin:0">
      <strong style="color:#2D3748">P.S. —</strong> Question #${selectedQ4} is one of our hardest questions. The fact that you got it right tells me something important about how your mind works with AI. Do not wait to see the full picture.
    </p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;border-top:1px solid #E2E8F0">
    <p style="font-size:11px;color:#A0AEC0;margin:0;font-family:Arial,sans-serif">© 2026 Practical AI Skills IQ. All rights reserved.<br/><a href="#" style="color:#A0AEC0;text-decoration:underline">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;

  } else if (type === 'followup5') {
    // ── EMAIL 5: Final urgency/FOMO — last email ──
    const tier5 = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
    const tierHeadline5 = tier5 === 'high'
      ? `You are in the top tier — do not let this expire`
      : tier5 === 'mid'
      ? `Your score puts you ahead of most — claim the full picture`
      : `Your AI gap is fixable — but only if you know where to start`;

    const tierMessage5 = tier5 === 'high'
      ? `You scored in the top percentile for practical AI skills. That means you have a real, measurable edge — but only if you know how to deploy it. Your personalized report maps exactly how to use that edge to get ahead in ${industry}.`
      : tier5 === 'mid'
      ? `You scored above average for your field. But "above average" will not be enough in 18 months — not when AI fluency becomes table stakes. Your personalized report shows you which specific skills to develop now, before the gap closes.`
      : `You already know AI is reshaping ${industry}. Your score reveals exactly which skills are holding you back — and which ones to develop first. That clarity is worth more than another week of guessing.`;

    subject = `Last chance: Your AI Skills IQ report expires at midnight`;
    html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1B4332 0%,#006644 100%);padding:32px 24px;text-align:center">
    <p style="color:rgba(255,255,255,.6);font-size:12px;margin:0 0 8px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase">Final Notice</p>
    <h1 style="color:#EEAF00;font-size:22px;margin:0;font-family:Arial,sans-serif">${tierHeadline5}</h1>
    <p style="color:rgba(255,255,255,.65);font-size:13px;margin:10px 0 0;font-family:Arial,sans-serif">Your $1 access window closes tonight at midnight</p>
  </div>
  <div style="padding:36px 32px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px;font-family:Arial,sans-serif">Hi ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px;font-family:Arial,sans-serif">This is my final email about your Practical AI Skills IQ results.</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px;font-family:Arial,sans-serif">${tierMessage5}</p>
    <div style="background:linear-gradient(135deg,rgba(27,67,50,.05),rgba(238,175,0,.05));border:2px solid #C9A84C;border-radius:10px;padding:24px;margin-bottom:28px;text-align:center">
      <p style="font-size:13px;color:#718096;text-decoration:line-through;margin:0 0 4px;font-family:Arial,sans-serif">Regular price: $9.99</p>
      <p style="font-size:28px;color:#006644;font-weight:700;margin:0 0 4px;font-family:Arial,sans-serif">$1.00 <span style="font-size:14px;color:#718096;font-weight:400">— 90% off, tonight only</span></p>
      <p style="font-size:12px;color:#C0392B;font-weight:700;margin:0;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px">⏰ Expires midnight tonight</p>
    </div>
    <div style="background:#F9F5F0;border-radius:8px;padding:20px;margin-bottom:28px">
      <p style="font-size:13px;color:#2D3748;font-weight:700;margin:0 0 12px;font-family:Arial,sans-serif">Your personalized report includes:</p>
      <table style="width:100%;font-size:13px;color:#4A5568;font-family:Arial,sans-serif">
        <tr><td style="padding:4px 0">✅</td><td style="padding:4px 0 4px 8px">Complete breakdown of all 6 AI skill categories</td></tr>
        <tr><td style="padding:4px 0">✅</td><td style="padding:4px 0 4px 8px">Your exact percentile vs. 12,000+ professionals in ${industry}</td></tr>
        <tr><td style="padding:4px 0">✅</td><td style="padding:4px 0 4px 8px">The #1 skill gap holding you back from AI leadership</td></tr>
        <tr><td style="padding:4px 0">✅</td><td style="padding:4px 0 4px 8px">Personalized 4-day action plan to close that gap</td></tr>
        <tr><td style="padding:4px 0">✅</td><td style="padding:4px 0 4px 8px">Downloadable PDF you keep forever</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${checkoutUrl}" style="display:inline-block;background:#EEAF00;color:#FFFFFF;font-weight:bold;font-size:17px;padding:18px 52px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;font-family:Arial,sans-serif">Get My Report for $1 →</a>
      <p style="font-size:12px;color:#A0AEC0;margin:10px 0 0;font-family:Arial,sans-serif">Secure checkout · Instant access · 30-day money-back guarantee</p>
    </div>
    <p style="font-size:13px;color:#718096;line-height:1.6;margin-bottom:16px;font-family:Arial,sans-serif">
      After midnight, the $1 offer ends and your results expire from our system. We will not email you again.
    </p>
    <p style="font-size:14px;color:#2D3748;margin-bottom:4px;font-family:Arial,sans-serif">Scott Magnacca<br/><span style="font-weight:400;color:#718096;font-size:12px">Practical AI Skills IQ</span></p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;border-top:1px solid #E2E8F0">
    <p style="font-size:11px;color:#A0AEC0;margin:0;font-family:Arial,sans-serif">© 2026 Practical AI Skills IQ. All rights reserved.<br/><a href="#" style="color:#A0AEC0;text-decoration:underline">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;
  } else if (type === 'followup6') {
    // ── EMAIL 6: "I Almost Didn't Send This" — Final last chance, hesitation reframe ──
    const tier6 = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
    const tierMsg6 = tier6 === 'high'
      ? `You may be further ahead than you think. Your responses showed strong pattern recognition across multiple AI scenarios — but without seeing your full breakdown, you cannot know which specific skills to leverage right now.`
      : tier6 === 'mid'
      ? `You scored above average for your field. But "above average" will not be enough in 18 months — not when AI fluency becomes table stakes. Your report shows which skills to develop now, before the window closes.`
      : `You already know AI is reshaping ${industry}. Your score pinpoints exactly which skills are holding you back — and the order to develop them. That clarity is worth more than another week of guessing.`;

    subject = `I almost didn't send this (about your AI IQ results)`;
    html = `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:Arial,sans-serif;background:#eef2f7;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12)">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#071810 0%,#0A2E1A 40%,#0D3D22 100%);padding:0;position:relative;overflow:hidden">
    <div style="position:absolute;top:-30px;right:-30px;width:160px;height:160px;background:radial-gradient(circle,rgba(201,168,76,0.18) 0%,transparent 70%);border-radius:50%"></div>
    <div style="position:absolute;bottom:-20px;left:-20px;width:120px;height:120px;background:radial-gradient(circle,rgba(238,175,0,0.12) 0%,transparent 70%);border-radius:50%"></div>
    <div style="background:rgba(201,168,76,0.15);border-bottom:1px solid rgba(201,168,76,0.25);padding:10px 24px;text-align:center">
      <span style="font-size:11px;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif">✦ Final Message ✦</span>
    </div>
    <div style="padding:32px 28px 36px;text-align:center;position:relative">
      <div style="margin-bottom:16px">
        <span style="font-size:42px;display:block;line-height:1">🧠</span>
        <span style="font-size:13px;color:rgba(201,168,76,0.7);letter-spacing:1.5px;text-transform:uppercase;display:block;margin-top:6px;font-family:Arial,sans-serif">Practical AI Skills IQ</span>
      </div>
      <h1 style="color:#EEAF00;font-size:22px;font-weight:700;margin:0 0 10px;line-height:1.35;font-family:Georgia,'Times New Roman',serif">
        I almost didn't send this email.
      </h1>
      <p style="color:rgba(255,255,255,0.72);font-size:14px;margin:0;line-height:1.6;font-family:Arial,sans-serif">
        But after reviewing your responses, I realized something important.
      </p>
      <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);margin:20px auto 0"></div>
    </div>
  </div>

  <!-- BODY -->
  <div style="padding:36px 32px">
    <p style="font-size:16px;color:#2D3748;margin:0 0 20px;font-family:Arial,sans-serif">Hi ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.75;margin:0 0 20px;font-family:Arial,sans-serif">
      You took the Practical AI Skills IQ Assessment a few days ago — and you haven't claimed your full results yet.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.75;margin:0 0 24px;font-family:Arial,sans-serif">
      I've been thinking about why. And I want to share something that might surprise you.
    </p>

    <!-- Insight callout box -->
    <div style="background:linear-gradient(135deg,#071810,#0D3D22);border-radius:10px;padding:24px 28px;margin-bottom:28px;border-left:4px solid #C9A84C">
      <p style="color:#C9A84C;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 10px;font-weight:700;font-family:Arial,sans-serif">What the data shows</p>
      <p style="color:#FFFFFF;font-size:15px;line-height:1.7;margin:0;font-weight:500;font-family:Arial,sans-serif">
        People who score in the <strong style="color:#EEAF00">top 25% for practical AI skills</strong> are often the <em>most hesitant</em> to claim their results.
      </p>
      <p style="color:rgba(255,255,255,0.65);font-size:13px;line-height:1.6;margin:12px 0 0;font-family:Arial,sans-serif">
        High performers tend to focus on what they don't know — not on the real, measurable strengths they already have.
      </p>
    </div>

    <p style="font-size:14px;color:#4A5568;line-height:1.75;margin:0 0 20px;font-family:Arial,sans-serif">${tierMsg6}</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.75;margin:0 0 24px;font-family:Arial,sans-serif">
      Two things I want you to know — regardless of where you scored:
    </p>

    <!-- Two points -->
    <div style="margin-bottom:28px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr>
          <td style="width:36px;vertical-align:top;padding-top:3px">
            <div style="width:28px;height:28px;background:#C9A84C;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#FFFFFF;font-family:Arial,sans-serif">1</div>
          </td>
          <td style="padding-left:12px;font-size:14px;color:#2D3748;line-height:1.65;font-family:Arial,sans-serif">
            <strong>Knowing your unique strengths is the first step to using them.</strong> Your personalized report shows exactly where you stand — a category-by-category breakdown with peer comparisons across ${industry}.
          </td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="width:36px;vertical-align:top;padding-top:3px">
            <div style="width:28px;height:28px;background:#C9A84C;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#FFFFFF;font-family:Arial,sans-serif">2</div>
          </td>
          <td style="padding-left:12px;font-size:14px;color:#2D3748;line-height:1.65;font-family:Arial,sans-serif">
            <strong>AI readiness can always be improved</strong> — but only when you know what to work on first. Without your report, you're guessing.
          </td>
        </tr>
      </table>
    </div>

    <!-- Testimonials -->
    <div style="background:#F9F5EE;border-radius:10px;padding:20px 24px;margin-bottom:28px;border:1px solid #E8DFC8">
      <p style="font-size:12px;color:#8B7355;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin:0 0 16px;font-family:Arial,sans-serif">What others said after claiming their results</p>
      <div style="border-left:3px solid #C9A84C;padding-left:14px;margin-bottom:16px">
        <p style="font-size:13px;color:#4A5568;line-height:1.65;margin:0 0 6px;font-style:italic;font-family:Arial,sans-serif">
          "I was hesitant because I thought the results might be discouraging. Instead, the breakdown showed me where I was already strong — I just hadn't recognized it. Worth every penny."
        </p>
        <p style="font-size:12px;color:#4A5568;margin:0;font-weight:600;font-family:Arial,sans-serif">— Marcus T., Operations Director</p>
      </div>
      <div style="border-left:3px solid #C9A84C;padding-left:14px">
        <p style="font-size:13px;color:#4A5568;line-height:1.65;margin:0 0 6px;font-style:italic;font-family:Arial,sans-serif">
          "The category breakdown and peer comparison were eye-opening. I knew AI was important — I didn't know I was already ahead of most people in my field. That confidence alone was worth it."
        </p>
        <p style="font-size:12px;color:#4A5568;margin:0;font-weight:600;font-family:Arial,sans-serif">— Priya S., Marketing Lead</p>
      </div>
    </div>

    <!-- Offer box -->
    <div style="background:linear-gradient(135deg,rgba(10,31,21,0.04),rgba(238,175,0,0.06));border:2px solid #C9A84C;border-radius:10px;padding:22px 26px;margin-bottom:28px;text-align:center">
      <p style="font-size:13px;color:#718096;text-decoration:line-through;margin:0 0 4px;font-family:Arial,sans-serif">Regular price: $9.99</p>
      <p style="font-size:30px;color:#006644;font-weight:700;margin:0 0 4px;font-family:Arial,sans-serif">$1.00</p>
      <p style="font-size:13px;color:#4A5568;margin:0 0 8px;font-family:Arial,sans-serif">Complete personalized AI Skills report · Instant access · PDF download</p>
      <p style="font-size:12px;color:#C0392B;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:0;font-family:Arial,sans-serif">⏰ Final offer — we won't email you again after today</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px">
      <a href="${checkoutUrl}" style="display:inline-block;background:linear-gradient(135deg,#EEAF00,#D4A017);color:#071810;font-weight:700;font-size:17px;padding:18px 56px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;font-family:Arial,sans-serif">
        See My Full AI IQ Results →
      </a>
      <p style="font-size:12px;color:#718096;margin:10px 0 0;font-family:Arial,sans-serif">Secure checkout · 30-day money-back guarantee</p>
    </div>

    <p style="font-size:14px;color:#4A5568;line-height:1.75;margin:0 0 20px;font-family:Arial,sans-serif">
      You already invested the time to take the assessment. Don't let uncertainty about the results be the thing that stops you from understanding your own strengths.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.75;margin:0 0 24px;font-family:Arial,sans-serif">
      This is the last email I'll send. Whatever you decide — keep building your AI skills. The window for advantage is still open, but it won't be forever.
    </p>
    <p style="font-size:14px;color:#2D3748;margin:0;font-family:Arial,sans-serif">
      Scott Magnacca<br/>
      <span style="color:#718096;font-size:13px">Practical AI Skills IQ | salesforlife.ai</span>
    </p>
  </div>

  <!-- FOOTER -->
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;border-top:1px solid #E2E8F0">
    <p style="font-size:11px;color:#4A5568;margin:0;line-height:1.6;font-family:Arial,sans-serif">
      © 2026 Practical AI Skills IQ. All rights reserved.<br/>
      <a href="#" style="color:#4A5568;text-decoration:underline">Unsubscribe</a> · salesforlife.ai
    </p>
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
      const fu4Sent = (row[24] || '').toUpperCase() === 'TRUE';
      const fu5Sent = (row[25] || '').toUpperCase() === 'TRUE';
      const fu6Sent = (row[26] || '').toUpperCase() === 'TRUE';

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

      // ONE email per lead per scheduler run — find the next unsent email due and send only that one.
      // This prevents batched sends when a lead has multiple overdue emails (e.g. after a data gap).
      const schedule = [
        { minHours: 2,  sent: fu1Sent, type: 'followup1', col: `V${rowNum}` },
        { minHours: 4,  sent: fu2Sent, type: 'followup2', col: `W${rowNum}` },
        { minHours: 6,  sent: fu3Sent, type: 'followup3', col: `X${rowNum}` },
        { minHours: 8,  sent: fu4Sent, type: 'followup4', col: `Y${rowNum}` },
        { minHours: 24, sent: fu5Sent, type: 'followup5', col: `Z${rowNum}` },
        { minHours: 60, sent: fu6Sent, type: 'followup6', col: `AA${rowNum}` },
      ];

      for (const step of schedule) {
        if (hoursSince >= step.minHours && !step.sent) {
          try {
            await sendFollowUp(email, step.type, data);
            await updateCell(token, step.col, 'TRUE');
            sent++;
            console.log(`${step.type} sent to ${email}`);
          } catch (e) { console.error(`${step.type} failed for ${email}:`, e.message); }
          break; // Only send ONE email per lead per scheduler run
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ checked: rows.length, sent }) };
  } catch (err) {
    console.error('check-followups error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
