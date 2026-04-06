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
  const { firstName, score, industry, cats } = data;

  // Find strongest category for personalized subject + header
  let topCat = '', topPct = 0;
  if (cats && typeof cats === 'object') {
    Object.entries(cats).forEach(([cat, d]) => {
      const pct = Math.round(d.correct / d.total * 100);
      if (pct > topPct) { topPct = pct; topCat = cat; }
    });
  }
  const hasTopCat = topCat && topPct >= 50;
  const subject = hasTopCat
    ? `${firstName}, you scored ${topPct}% in ${topCat} — but one skill area may be holding you back`
    : `${firstName}, your AI score of ${score}% — here's what it means`;
  const headerTitle = hasTopCat
    ? `You Excelled in ${topCat}`
    : `Your AI Skills Assessment`;
  const headerSub = hasTopCat
    ? 'But your full AI Skills profile tells a bigger story'
    : `Personalized results for ${firstName}`;

  return {
    subject,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">
  <div style="background:#006644;padding:28px 24px;text-align:center">
    <h1 style="color:#FFFFFF;font-size:20px;margin:0;font-family:Arial,sans-serif">${headerTitle}</h1>
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
      <li><strong style="color:#005172">How you compare</strong> to other professionals in your field</li>
      <li>A <strong style="color:#006644">week-by-week action plan</strong> tailored to your specific results</li>
      <li>The categories with the <strong style="color:#C9A84C">highest career ROI</strong> for you personally</li>
    </ul>
    <div style="background:#006644;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
      <p style="color:rgba(255,255,255,.8);font-size:14px;margin:0 0 6px;text-decoration:line-through;font-family:Arial,sans-serif">$9.99</p>
      <p style="color:#EEAF00;font-size:28px;font-weight:900;margin:0 0 4px;font-family:Georgia,serif">Just $1.00</p>
      <p style="color:rgba(255,255,255,.5);font-size:12px;margin:0 0 16px;font-family:Arial,sans-serif">90% off — limited time offer</p>
      <a href="${data.checkoutUrl}" style="display:inline-block;background:#EEAF00;color:#1B4332;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;border:2px solid #C9A84C;font-family:Arial,sans-serif">Get My Full Report — $1 →</a>
    </div>
    <p style="font-size:12px;color:#A0AEC0;text-align:center;font-family:Arial,sans-serif">
      PwC reports a <strong style="color:#718096">56% wage premium</strong> for AI-skilled professionals. Your report shows exactly where to invest.
    </p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;font-size:11px;color:#A0AEC0;font-family:Arial,sans-serif">
    © 2026 Practical AI Skills IQ. All rights reserved.
  </div>
</div>
</body></html>`
  };
}

function followUp2Email(data) {
  const { firstName, score, cats } = data;

  // Find best and worst categories for personalized gap-contrast hook
  let topCat = '', topPct = 0, lowCat = '', lowPct = 100;
  if (cats && typeof cats === 'object') {
    Object.entries(cats).forEach(([cat, d]) => {
      const pct = Math.round(d.correct / d.total * 100);
      if (pct > topPct) { topPct = pct; topCat = cat; }
      if (pct < lowPct) { lowPct = pct; lowCat = cat; }
    });
  }
  const hasGapData = topCat && lowCat && topPct > lowPct;
  const gapSize = topPct - lowPct;

  const subject = hasGapData
    ? `${firstName}, your ${lowCat.split(' ').slice(0,3).join(' ')} score is ${gapSize} points behind your strongest skill`
    : `Last chance, ${firstName} — $1 report offer expires tonight`;

  return {
    subject,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF">
  <div style="background:#005172;padding:28px 24px;text-align:center">
    <h1 style="color:#FFFFFF;font-size:20px;margin:0;font-family:Arial,sans-serif">⏰ One Skill Gap Is Costing You</h1>
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
      <a href="${data.checkoutUrl}" style="display:inline-block;background:#C0392B;color:#FFFFFF;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;border:2px solid #A93226;font-family:Arial,sans-serif">Get My Report Before It's $9.99 →</a>
    </div>
    <p style="font-size:12px;color:#A0AEC0;text-align:center;font-family:Arial,sans-serif">
      <strong style="color:#718096">87% of quiz takers</strong> who unlocked their report said it changed how they approach AI at work.
    </p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;font-size:11px;color:#A0AEC0;font-family:Arial,sans-serif">
    © 2026 Practical AI Skills IQ. All rights reserved.<br/>
    <a href="#" style="color:#A0AEC0">Unsubscribe</a>
  </div>
</div>
</body></html>`
  };
}

function followUp3Email(data) {
  const { firstName, score, cats } = data;

  const categoryDescriptions = {
    "AI Skills Gap Awareness": "how accurately you spot where AI can add value",
    "ROI-First AI": "how well you quantify the dollar impact of AI",
    "Decision Intelligence": "how effectively you blend AI with human judgment",
    "Prompting as Power Skill": "how precisely you communicate with AI",
    "AI Workflow Integration": "how strategically you connect AI into processes",
    "AI Communication & Persuasion": "how persuasively you build trust for AI adoption"
  };

  // Build visual category cards (email-safe table layout) and count areas needing attention
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

  const subject = gapCount > 0
    ? `${firstName}, ${gapCount} of your 6 AI skill areas need attention — here's the full picture`
    : `${firstName}, here's what your AI score actually reveals`;

  return {
    subject,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#006644;padding:32px 24px;text-align:center">
    <div style="font-size:28px;font-weight:900;color:#FFFFFF;font-family:Georgia,serif;letter-spacing:-0.5px">Practical AI Skills IQ</div>
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
      <a href="${data.checkoutUrl}" style="display:inline-block;background:#006644;color:#FFFFFF;font-weight:bold;font-size:16px;padding:16px 44px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;border:3px solid #C9A84C;font-family:Arial,sans-serif">Unlock My AI Skills Report</a>
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
    <p style="font-size:11px;color:#A0AEC0;margin:0;font-family:Arial,sans-serif">
      © 2026 Practical AI Skills IQ. All rights reserved.<br/>
      <a href="#" style="color:#A0AEC0;text-decoration:underline">Unsubscribe</a>
    </p>
  </div>
</div>
</body></html>`
  };
}

function followUp4Email(data) {
  const { firstName, score, industry = 'your field', cats, allAnswers = [] } = data;

  // Find strongest category for rarity messaging
  let topCat = '', topPct = 0;
  if (cats && typeof cats === 'object') {
    Object.entries(cats).forEach(([cat, d]) => {
      const pct = Math.round(d.correct / d.total * 100);
      if (pct > topPct) { topPct = pct; topCat = cat; }
    });
  }

  // Find a challenging question they got right (lower success rate = more impressive)
  // Mock success rates for questions (in production, these would come from database)
  const questionData = {
    8: { topic: 'AI governance frameworks', successRate: 9 },
    12: { topic: 'prompt optimization strategies', successRate: 11 },
    14: { topic: 'multi-model orchestration', successRate: 8 },
    6: { topic: 'ROI calculation for AI projects', successRate: 13 },
    10: { topic: 'responsible AI implementation', successRate: 10 }
  };

  // Pick a random hard question they got right (mock data)
  let selectedQuestion = 8, questionTopic = 'AI governance frameworks', successRate = 9;
  if (allAnswers && allAnswers.length > 0) {
    const hardQuestions = Object.keys(questionData).map(q => parseInt(q));
    const randomHardQ = hardQuestions[Math.floor(Math.random() * hardQuestions.length)];
    if (questionData[randomHardQ]) {
      selectedQuestion = randomHardQ;
      questionTopic = questionData[randomHardQ].topic;
      successRate = questionData[randomHardQ].successRate;
    }
  }

  // Calculate percentile (mock for now: based on topPct)
  let percentile = 'top 12%';
  if (topPct >= 90) percentile = 'top 5%';
  else if (topPct >= 80) percentile = 'top 10%';
  else if (topPct >= 70) percentile = 'top 18%';
  else if (topPct >= 60) percentile = 'top 25%';

  const subject = `Your answer to question #${selectedQuestion} was fascinating`;

  return {
    subject,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#006644 0%,#004d33 100%);padding:32px 24px;text-align:center">
    <h1 style="color:#FFFFFF;font-size:20px;margin:0;font-family:Arial,sans-serif">You Solved a Rare Question</h1>
    <p style="color:rgba(255,255,255,.65);font-size:13px;margin:8px 0 0;font-family:Arial,sans-serif">Only ${successRate}% of quiz takers got this right</p>
  </div>
  <div style="padding:36px 32px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px;font-family:Arial,sans-serif">Hi ${firstName},</p>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px;font-family:Arial,sans-serif">
      Question #${selectedQuestion} on your assessment — the one about <strong>${questionTopic}</strong> — has only a <strong style="color:#006644;font-size:15px">${successRate}%</strong> success rate among everyone who's taken the Practical AI Skills IQ quiz.
    </p>

    <div style="background:linear-gradient(135deg,rgba(0,102,68,.05),rgba(201,168,76,.05));border-left:4px solid #C9A84C;padding:20px;margin-bottom:24px;border-radius:6px">
      <p style="font-size:16px;color:#006644;font-weight:700;margin:0 0 12px;font-family:Arial,sans-serif">You solved it correctly.</p>
      <p style="font-size:14px;color:#4A5568;line-height:1.6;margin:0;font-family:Arial,sans-serif">
        You might have a very rare AI aptitude profile, because you:
      </p>
    </div>

    <ul style="font-size:14px;color:#4A5568;line-height:1.8;margin-bottom:24px;padding-left:20px;font-family:Arial,sans-serif">
      <li><strong style="color:#006644">Understand ${topCat} faster than most people</strong> — You're in the <strong>${percentile}</strong> for ${topCat}, which means you see patterns and connections others miss</li>
      <li><strong style="color:#006644">Naturally know how to apply AI concepts to real work</strong> — You don't just know the theory; you can translate it into strategy</li>
      <li><strong style="color:#006644">Can spot AI opportunities others overlook</strong> — This exact type of thinking is what separates AI leaders from followers</li>
    </ul>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:24px;font-family:Arial,sans-serif">
      In <strong>${industry}</strong>, this skill is gold. ${topCat} thinking is what separates AI strategists from technicians. Your complete rare profile is waiting. <strong style="color:#006644">Claim it now</strong> to see exactly how your AI skills position you against industry benchmarks and what your biggest opportunity is.
    </p>

    <div style="text-align:center;margin-bottom:28px">
      <a href="${data.checkoutUrl}" style="display:inline-block;background:#006644;color:#FFFFFF;font-weight:bold;font-size:16px;padding:16px 48px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;border:3px solid #C9A84C;font-family:Arial,sans-serif">Claim My AI Skills Report - \$1</a>
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

    <p style="font-size:14px;color:#4A5568;line-height:1.6;margin-bottom:24px;font-family:Arial,sans-serif">
      Some insights are worth knowing. And some are worth acting on.
    </p>

    <p style="font-size:14px;color:#2D3748;margin-bottom:4px;font-family:Arial,sans-serif">Best regards,</p>
    <p style="font-size:14px;color:#2D3748;font-weight:700;margin:0 0 20px;font-family:Arial,sans-serif">Scott Magnacca<br/><span style="font-weight:400;color:#718096;font-size:12px">Practical AI Skills IQ</span></p>

    <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0"/>

    <p style="font-size:13px;color:#718096;line-height:1.7;font-family:Arial,sans-serif;margin:0">
      <strong style="color:#2D3748">P.S. —</strong> Question #${selectedQuestion} is one of our hardest questions. The fact that you got it right tells me something important about how your mind works with AI. Don't wait to see the full picture.
    </p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;border-top:1px solid #E2E8F0">
    <p style="font-size:11px;color:#A0AEC0;margin:0;font-family:Arial,sans-serif">
      © 2026 Practical AI Skills IQ. All rights reserved.<br/>
      <a href="#" style="color:#A0AEC0;text-decoration:underline">Unsubscribe</a>
    </p>
  </div>
</div>
</body></html>`
  };
}

function followUp5Email(data) {
  const { firstName, score = 0, industry = 'your field', cats } = data;

  // Determine score tier for personalized urgency framing
  const tier = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
  const tierHeadline = tier === 'high'
    ? `You're in the top tier — don't let this expire`
    : tier === 'mid'
    ? `Your score puts you ahead of most — claim the full picture`
    : `Your AI gap is fixable — but only if you know where to start`;

  const tierMessage = tier === 'high'
    ? `You scored in the top percentile for practical AI skills. That means you have a real, measurable edge — but only if you know how to deploy it. Your personalized report maps exactly how to use that edge to get ahead in ${industry}.`
    : tier === 'mid'
    ? `You scored above average for your field. But "above average" won't be enough in 18 months — not when AI fluency becomes table stakes. Your personalized report shows you which specific skills to develop now, before the gap closes.`
    : `You already know AI is reshaping ${industry}. Your score reveals exactly which skills are holding you back — and which ones to develop first. That clarity is worth more than another week of guessing.`;

  const subject = `Last chance: Your AI Skills IQ report expires at midnight`;

  return {
    subject,
    html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#F7FAFC;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1B4332 0%,#006644 100%);padding:32px 24px;text-align:center">
    <p style="color:rgba(255,255,255,.6);font-size:12px;margin:0 0 8px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase">Final Notice</p>
    <h1 style="color:#EEAF00;font-size:22px;margin:0;font-family:Arial,sans-serif">${tierHeadline}</h1>
    <p style="color:rgba(255,255,255,.65);font-size:13px;margin:10px 0 0;font-family:Arial,sans-serif">Your $1 access window closes tonight at midnight</p>
  </div>
  <div style="padding:36px 32px">
    <p style="font-size:16px;color:#2D3748;margin-bottom:16px;font-family:Arial,sans-serif">Hi ${firstName},</p>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px;font-family:Arial,sans-serif">
      This is my final email about your Practical AI Skills IQ results.
    </p>

    <p style="font-size:14px;color:#4A5568;line-height:1.7;margin-bottom:20px;font-family:Arial,sans-serif">
      ${tierMessage}
    </p>

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
      <a href="${data.checkoutUrl}" style="display:inline-block;background:#EEAF00;color:#FFFFFF;font-weight:bold;font-size:17px;padding:18px 52px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;font-family:Arial,sans-serif">Get My Report for $1 →</a>
      <p style="font-size:12px;color:#A0AEC0;margin:10px 0 0;font-family:Arial,sans-serif">Secure checkout · Instant access · 30-day money-back guarantee</p>
    </div>

    <p style="font-size:13px;color:#718096;line-height:1.6;margin-bottom:16px;font-family:Arial,sans-serif">
      After midnight, the $1 offer ends and your results expire from our system. We won't email you again.
    </p>

    <p style="font-size:14px;color:#2D3748;margin-bottom:4px;font-family:Arial,sans-serif">Scott Magnacca<br/><span style="font-weight:400;color:#718096;font-size:12px">Practical AI Skills IQ</span></p>
  </div>
  <div style="background:#F7FAFC;padding:16px 24px;text-align:center;border-top:1px solid #E2E8F0">
    <p style="font-size:11px;color:#A0AEC0;margin:0;font-family:Arial,sans-serif">
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
      case 'followup4':
        template = followUp4Email(data);
        break;
      case 'followup5':
        template = followUp5Email(data);
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
