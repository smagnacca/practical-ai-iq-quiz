// Netlify Function: send-email.js
// Sends personalized emails via Resend API
// Env vars needed: RESEND_API_KEY
// No npm packages needed — uses native fetch

// ──── EMAIL TEMPLATES ────

function confirmationEmail(data) {
  const { firstName, score, industry, cats } = data;
  const catSummary = Object.entries(cats || {}).map(([cat, d]) => {
    const pct = Math.round(d.correct / d.total * 100);
    const emoji = pct >= 80 ? '⭐' : pct >= 50 ? '⚡' : '🎯';
    return `${emoji} ${cat}: ${pct}%`;
  }).join('<br/>');

  return {
    subject: `${firstName}, your AI Skills IQ Report is ready`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">
  <div style="background:#006644;padding:32px 24px;text-align:center">
    <h1 style="color:#FFFFFF;font-size:22px;margin:0">Your AI Skills IQ Report</h1>
    <p style="color:rgba(255,255,255,.7);font-size:14px;margin:8px 0 0">Personalized for ${firstName}</p>
  </div>
  <div style="padding:32px 24px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px">Dear ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px">
      Thank you for completing the Practical AI Skills IQ Quiz! Your personalized report is ready, and here's a quick snapshot of your results:
    </p>
    <div style="background:#F0FFF4;border:1px solid #C6F6D5;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px">
      <div style="font-size:36px;font-weight:bold;color:#006644">${score}%</div>
      <div style="font-size:12px;color:#718096;text-transform:uppercase;letter-spacing:1px">Your Score</div>
    </div>
    <div style="background:#FAFAF7;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;color:#4A5568;line-height:1.8">
      ${catSummary}
    </div>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:24px">
      Your full report includes detailed analysis for each category, industry benchmarks for ${industry || 'your field'}, and specific action steps to close your skill gaps.
    </p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${data.reportUrl}" style="display:inline-block;background:#006644;color:#FFFFFF;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none">View Your Full Report →</a>
    </div>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0"/>
    <p style="font-size:13px;color:#A0AEC0;text-align:center">
      Ready to close your AI skills gap? <a href="https://4daycourse.netlify.app" style="color:#006644">Explore our 4-Day AI Skills Intensive →</a>
    </p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;font-size:11px;color:#A0AEC0">
    © 2026 Practical AI Skills IQ. All rights reserved.
  </div>
</div>
</body></html>`
  };
}

function followUp1Email(data) {
  const { firstName, score, industry } = data;
  const scoreLabel = score >= 80 ? 'impressive' : score >= 60 ? 'solid' : score >= 40 ? 'revealing' : 'eye-opening';

  return {
    subject: `${firstName}, your AI score of ${score}% — here's what it means`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">
  <div style="background:#006644;padding:28px 24px;text-align:center">
    <h1 style="color:#FFFFFF;font-size:20px;margin:0">Your AI Skills Assessment</h1>
  </div>
  <div style="padding:32px 24px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px">Dear ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px">
      Earlier today you took the Practical AI Skills IQ Quiz and scored <strong>${score}%</strong> — a ${scoreLabel} result.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px">
      But your score is just the starting point. Your <strong>personalized AI Skills Report</strong> reveals:
    </p>
    <ul style="font-size:14px;color:#4A5568;line-height:1.8;padding-left:20px;margin-bottom:20px">
      <li>Exactly which of your 6 skill categories are strengths vs. critical gaps</li>
      <li>How you compare to other ${industry || 'professional'}s in your industry</li>
      <li>A week-by-week action plan tailored to your specific results</li>
      <li>The categories with the highest career ROI for you personally</li>
    </ul>
    <div style="background:linear-gradient(135deg,#006644,#005172);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
      <p style="color:rgba(255,255,255,.8);font-size:13px;margin:0 0 4px;text-decoration:line-through">$9.99</p>
      <p style="color:#FFFFFF;font-size:24px;font-weight:bold;margin:0 0 8px">Just $1.00</p>
      <p style="color:rgba(255,255,255,.6);font-size:12px;margin:0 0 16px">90% off — limited time offer</p>
      <a href="${data.checkoutUrl}" style="display:inline-block;background:#EEAF00;color:#1B4332;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none">Get My Full Report — $1 →</a>
    </div>
    <p style="font-size:12px;color:#A0AEC0;text-align:center">
      PwC reports a 56% wage premium for AI-skilled professionals. Your report shows exactly where to invest.
    </p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;font-size:11px;color:#A0AEC0">
    © 2026 Practical AI Skills IQ. All rights reserved.
  </div>
</div>
</body></html>`
  };
}

function followUp2Email(data) {
  const { firstName, score } = data;

  return {
    subject: `Last chance, ${firstName} — $1 report offer expires tonight`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">
  <div style="background:#005172;padding:28px 24px;text-align:center">
    <h1 style="color:#FFFFFF;font-size:20px;margin:0">⏰ Your $1 Offer Expires Soon</h1>
  </div>
  <div style="padding:32px 24px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px">Dear ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px">
      I wanted to make sure you saw this before the offer expires.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px">
      You scored <strong>${score}%</strong> on the AI Skills IQ Quiz — which means there are specific, identifiable gaps holding you back from the top tier.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:16px">
      <strong>Here's what 2,847 professionals who got their report told us:</strong>
    </p>
    <div style="background:#FAFAF7;border-left:4px solid #006644;padding:16px;margin-bottom:20px;font-size:13px;color:#4A5568;line-height:1.6;font-style:italic">
      "I thought I was good with AI until I saw my category breakdown. The report showed me I was spending time on the wrong skills. Two weeks later, I'd automated 6 hours of weekly work I didn't even realize was automatable."
      <br/><strong style="font-style:normal;color:#2D3748">— Sarah K., Marketing Director</strong>
    </div>
    <div style="border:2px dashed #C0392B;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
      <p style="color:#C0392B;font-weight:bold;font-size:14px;margin:0 0 4px">This $1 offer expires at midnight</p>
      <p style="color:#718096;font-size:12px;margin:0 0 16px">After that, the report returns to $9.99</p>
      <a href="${data.checkoutUrl}" style="display:inline-block;background:#C0392B;color:#FFFFFF;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none">Get My Report Before It's $9.99 →</a>
    </div>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;font-size:11px;color:#A0AEC0">
    © 2026 Practical AI Skills IQ. All rights reserved.<br/>
    <a href="#" style="color:#A0AEC0">Unsubscribe</a>
  </div>
</div>
</body></html>`
  };
}

function followUp3Email(data) {
  const { firstName, score, cats } = data;

  // Build the 6 category skill bullets dynamically from quiz results
  const categoryDescriptions = {
    "AI Skills Gap Awareness": "how accurately you spot where AI can add value in your daily work",
    "ROI-First AI": "how well you quantify the dollar impact of AI investments before committing",
    "Decision Intelligence": "how effectively you blend AI recommendations with human judgment",
    "Prompting as Power Skill": "how precisely you communicate with AI to get expert-level output",
    "AI Workflow Integration": "how strategically you connect AI into existing tools and team processes",
    "AI Communication & Persuasion": "how persuasively you build trust and make the case for AI adoption"
  };

  let categoryBullets = '';
  if (cats && typeof cats === 'object') {
    Object.entries(cats).forEach(([cat, d]) => {
      const pct = Math.round(d.correct / d.total * 100);
      const desc = categoryDescriptions[cat] || 'a key AI competency area';
      categoryBullets += `<li style="margin-bottom:12px"><strong>${cat}</strong>: ${desc}. <span style="color:${pct >= 80 ? '#27AE60' : pct >= 50 ? '#EEAF00' : '#C0392B'};font-weight:600">You scored ${pct}%</span></li>`;
    });
  } else {
    // Fallback if category data isn't available
    Object.entries(categoryDescriptions).forEach(([cat, desc]) => {
      categoryBullets += `<li style="margin-bottom:12px"><strong>${cat}</strong>: ${desc}</li>`;
    });
  }

  return {
    subject: `${firstName}, here's what your AI score actually reveals`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#006644,#005172);padding:32px 24px;text-align:center">
    <div style="font-size:28px;font-weight:900;color:#FFFFFF;font-family:Georgia,serif;letter-spacing:-0.5px">Practical AI Skills IQ</div>
  </div>
  <div style="padding:36px 32px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:20px">Hi ${firstName},</p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px">
      Your AI Skills score of <strong>${score}%</strong> is unique. But the real win is knowing your <em>specific</em> skill profile — where you're strong and where one gap could be quietly costing you.
    </p>
    <p style="font-size:14px;color:#2D3748;line-height:1.6;margin-bottom:12px">
      <strong>Your report breaks your results into 6 practical AI skill areas:</strong>
    </p>
    <ul style="font-size:14px;color:#4A5568;line-height:1.7;padding-left:20px;margin-bottom:28px">
      ${categoryBullets}
    </ul>
    <div style="text-align:center;margin-bottom:28px">
      <a href="${data.checkoutUrl}" style="display:inline-block;background:#006644;color:#FFFFFF;font-weight:bold;font-size:16px;padding:16px 44px;border-radius:8px;text-decoration:none;letter-spacing:0.3px">Unlock My AI Skills Report</a>
    </div>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:16px">
      Plus, you'll get a downloadable PDF with your personalized action plan and industry benchmarks.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:8px">
      When you see which AI skill is strongest (and which one holds you back), everything gets clearer. You can focus on your strengths and start closing the gaps that matter most.
    </p>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-top:24px;margin-bottom:4px">Best regards,</p>
    <p style="font-size:14px;color:#2D3748;font-weight:600;margin:0">The Practical AI Skills IQ Team</p>
  </div>
  <div style="background:#F7FAFC;padding:20px 24px;text-align:center;border-top:1px solid #E2E8F0">
    <p style="font-size:11px;color:#A0AEC0;margin:0">
      © 2026 Practical AI Skills IQ. All rights reserved.<br/>
      <a href="#" style="color:#A0AEC0;text-decoration:underline">Unsubscribe</a>
    </p>
  </div>
</div>
</body></html>`
  };
}

// ──── RESEND SENDER ────

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

// ──── MAIN HANDLER ────

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { type, email, data } = body;

    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };
    if (!process.env.RESEND_API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Resend not configured' }) };

    let template;
    switch (type) {
      case 'confirmation':
        template = confirmationEmail(data);
        break;
      case 'followup1':
        template = followUp1Email(data);
        break;
      case 'followup2':
        template = followUp2Email(data);
        break;
      case 'followup3':
        template = followUp3Email(data);
        break;
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email type' }) };
    }

    await sendViaResend(email, template.subject, template.html);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, type }) };
  } catch (err) {
    console.error('send-email error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
