// Netlify Function: send-immediate-email.js
// Fires immediately on quiz completion — sends personalized score summary to the user.
// Called from submitQuizData() in index.html (non-blocking, fire-and-forget).
// Env vars needed: RESEND_API_KEY
// No npm packages needed — uses native fetch

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { firstName, email, industry, score, categories } = JSON.parse(event.body || '{}');

    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };

    const name = firstName || 'there';

    // Build category breakdown rows
    const catRows = Object.entries(categories || {}).map(([cat, d]) => {
      const pct = Math.round((d.correct / d.total) * 100);
      const emoji = pct >= 80 ? '⭐' : pct >= 60 ? '✅' : '⚡';
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      return `<tr>
        <td style="padding:6px 0;font-size:13px;color:#4A5568">${emoji} ${cat}</td>
        <td style="padding:6px 0;font-size:13px;color:#718096;font-family:monospace">${bar}</td>
        <td style="padding:6px 0;font-size:13px;font-weight:700;color:#006644;text-align:right">${pct}%</td>
      </tr>`;
    }).join('');

    // Tier label
    let tier = 'Developing', tierColor = '#718096';
    if (score >= 80) { tier = 'Exceptional'; tierColor = '#D69E2E'; }
    else if (score >= 70) { tier = 'Advanced';    tierColor = '#006644'; }
    else if (score >= 60) { tier = 'Proficient';  tierColor = '#2B6CB0'; }
    else if (score >= 40) { tier = 'Emerging';    tierColor = '#C05621'; }

    const subject = `${name}, your AI Skills IQ score is ${score}% — here's what it means`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">

  <!-- Header -->
  <div style="background:#006644;padding:32px 24px;text-align:center">
    <p style="color:rgba(255,255,255,.7);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">Practical AI Skills IQ</p>
    <h1 style="color:#FFFFFF;font-size:22px;margin:0;font-weight:700">Your Results Are In</h1>
  </div>

  <!-- Score hero -->
  <div style="padding:32px 24px 0;text-align:center">
    <p style="font-size:16px;color:#2D3748;margin:0 0 20px">Hi ${name},</p>
    <div style="background:#F0FFF4;border:2px solid #C6F6D5;border-radius:12px;padding:24px;display:inline-block;min-width:180px;margin-bottom:8px">
      <div style="font-size:52px;font-weight:900;color:#006644;line-height:1">${score}%</div>
      <div style="font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:1.5px;margin-top:4px">AI Skills IQ</div>
    </div>
    <div style="margin-bottom:24px">
      <span style="display:inline-block;background:${tierColor};color:#fff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 14px;border-radius:20px">${tier}</span>
    </div>
    <p style="font-size:14px;color:#4A5568;line-height:1.7;max-width:460px;margin:0 auto 24px">
      You were assessed across 6 competency domains. Here's how you broke down — and where your highest-ROI opportunities are.
    </p>
  </div>

  <!-- Category breakdown -->
  ${catRows ? `
  <div style="padding:0 24px 24px">
    <h2 style="font-size:15px;color:#2D3748;border-bottom:2px solid #E2E8F0;padding-bottom:8px;margin-bottom:4px">Score Breakdown</h2>
    <table style="width:100%;border-collapse:collapse">${catRows}</table>
  </div>` : ''}

  <!-- CTA -->
  <div style="padding:0 24px 32px;text-align:center">
    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px">
      Your full report includes your ranked gap analysis, industry benchmarks for <strong>${industry || 'your field'}</strong>, and a specific action plan to close each gap — fast.
    </p>
    <a href="https://practical-ai-skills-iq.netlify.app" style="display:inline-block;background:#006644;color:#FFFFFF;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none">Get My Full Report — $1 →</a>
    <p style="font-size:12px;color:#A0AEC0;margin-top:12px">One-time fee. Instant access. 100% personalized to your ${score}% score.</p>
  </div>

  <!-- Peer context -->
  <div style="background:#FAFAFA;border-top:1px solid #E2E8F0;padding:20px 24px;text-align:center">
    <p style="font-size:13px;color:#718096;margin:0;line-height:1.6">
      The average score among all test-takers is <strong>58%</strong>. The top 10% score <strong>80%+</strong>.<br/>
      PwC reports a <strong>56% wage premium</strong> for AI-skilled workers.
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;font-size:11px;color:#A0AEC0;line-height:1.6">
    © 2026 Practical AI Skills IQ · All rights reserved<br/>
    <a href="https://practical-ai-skills-iq.netlify.app" style="color:#A0AEC0">practical-ai-skills-iq.netlify.app</a>
  </div>

</div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Practical AI Skills IQ <results@practical-ai-skills-iq.com>',
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('Resend API error: ' + err);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('send-immediate-email error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
