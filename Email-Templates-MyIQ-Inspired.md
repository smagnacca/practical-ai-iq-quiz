# Email Templates — Post-IQ Test Engagement (Non-Payers)

## Template Source & Inspiration
These email templates are inspired by MyIQ.com's high-conversion post-assessment follow-up sequence. They target users who took the Practical AI Skills IQ quiz but have NOT yet purchased the personalized report ($1). Goal: drive engagement, curiosity, and conversion by highlighting rare strengths and creating urgency.

---

## Email #4: "Your Answer to Question #X Was Fascinating"

**Subject Line Options:**
- "Your answer to question #8 was fascinating"
- "That's an 11% success rate among 50,000+ quiz takers"
- "You spotted something most people miss"

**Personalization Variables:**
- `{{firstName}}` — User's first name
- `{{questionNumber}}` — Question they answered correctly that had low success rate
- `{{successRate}}` — % of users who got this right (should be low: 5-15%)
- `{{categoryStrength}}` — One of their top-scoring categories (Concepts, Frameworks, Practical, Ethics, Leadership, Business)
- `{{categoryPercentile}}` — What percentile they're in for this category (e.g., "top 12%")

---

### Email Copy (Personalized for Practical AI Skills IQ)

**From:** Practical AI Skills <hello@salesforlife.ai>
**Subject:** Your answer to question #{{questionNumber}} was fascinating
**Send Trigger:** 8 hours after quiz completion (if payment not received)

---

**Body:**

Hi {{firstName}},

Question #{{questionNumber}} on your assessment — the one about {{questionTopic}} — has only a {{successRate}}% success rate among everyone who's taken the Practical AI Skills IQ quiz.

**You solved it correctly.**

You might have a very rare AI aptitude profile, because you:
* **Understand {{categoryStrength}} faster than most people** — You're in the top {{categoryPercentile}} for {{categoryStrength}}, which means you see patterns and connections others miss
* **Naturally know how to apply AI concepts to real work** — You don't just know the theory; you can translate it into strategy
* **Can spot AI opportunities others overlook** — This exact type of thinking is what separates AI leaders from followers

Some careers rely on this exact type of thinking (AI product strategy, technical leadership, innovation strategy). Your complete rare profile is waiting. **Claim it now** to see exactly how your AI skills position you against industry benchmarks and what your blind spots are.

**[Claim My AI Skills Report]**

Your complete analysis will show you:
- Exactly which AI skill is your hidden strength
- How your profile compares to 50,000+ professionals
- The #1 skill gap holding you back
- A personalized 4-day action plan to close that gap

Some insights are worth knowing. And some are worth acting on.

Best regards,
**Scott Magnacca**
Practical AI Skills IQ

P.S. — Question #{{questionNumber}} is our hardest question. The fact that you got it right tells me something important about how your mind works with AI. Don't wait to see the full picture.

---

## Email #4 — Customized Example (Ready to Send)

**For a user named "Alexandra" who:**
- Got question #8 correct (only 9% success rate)
- Scored high in "Frameworks" (top 14%)
- Took quiz 8 hours ago
- From Finance industry
- Has NOT paid yet

---

**Subject:** Your answer to question #8 was fascinating

**Body:**

Hi Alexandra,

Question #8 on your assessment — the one about AI governance frameworks — has only a 9% success rate among everyone who's taken the Practical AI Skills IQ quiz.

**You solved it correctly.**

You might have a very rare AI aptitude profile, because you:
* **Understand AI Frameworks faster than most people** — You're in the top 14% for Frameworks, which means you see patterns and connections others miss
* **Naturally know how to apply AI concepts to real work** — You don't just know the theory; you can translate it into strategy
* **Can spot AI opportunities others overlook** — This exact type of thinking is what separates AI leaders from followers

In finance, this skill is gold. Frameworks thinking is what separates AI strategists from technicians. Your complete rare profile is waiting. **Claim it now** to see exactly how your AI skills position you against industry benchmarks and what your biggest opportunity is.

**[Claim My AI Skills Report - $1]**

Your complete analysis will show you:
- Exactly which AI skill is your hidden strength
- How your profile compares to 50,000+ professionals in finance
- The #1 skill gap holding you back from AI leadership
- A personalized 4-day action plan to close that gap

Some insights are worth knowing. And some are worth acting on.

Best regards,
**Scott Magnacca**
Practical AI Skills IQ

P.S. — Question #8 is our hardest question. The fact that you got it right tells me something important about how your mind works with AI. Don't wait to see the full picture.

---

## Psychological Triggers Used (MyIQ Template Analysis)

| Trigger | Copy Example | Why It Works |
|---------|--------------|-------------|
| **Rarity/Exclusivity** | "9% success rate", "top 14%", "very rare profile" | Makes them feel special, not like everyone else |
| **Social Proof** | "50,000+ professionals", "89% of people", "others miss" | Creates context for why this matters |
| **Curiosity Gap** | "Your complete profile is waiting", "Don't wait to see the full picture" | Open loop they want to close |
| **Specificity** | Names exact question, exact stat, exact category | More credible than vague claims |
| **Career Relevance** | "In finance, this skill is gold", "separates AI leaders from followers" | Connects to their job/identity |
| **Scarcity/Urgency** | "Your complete rare profile is waiting", "Don't wait" | Subtle FOMO without being pushy |
| **Authority** | "Dr. Sarah Chen, Senior Cognitive Analyst" / "Scott Magnacca" | Makes the insight feel credible |
| **Benefit Stacking** | Bullets show 3 reasons they're rare + 3 things they'll learn | More compelling than single benefit |

---

## Implementation Notes

**Timing:** Send 8 hours after quiz completion (people have had time to reflect, but haven't forgotten the quiz)

**Frequency:** This should be Email #4 in the non-payer sequence:
- Email #1 (2 hours): "Here's your score [preview]" + CTA to pay
- Email #2 (4 hours): "You scored higher than you think" [social proof]
- Email #3 (6 hours): "People in {{industry}} average {{benchmark}}" [industry comparison]
- **Email #4 (8 hours): "Your answer to question #X was fascinating"** ← YOU ARE HERE
- Email #5 (24 hours): Final urgency/FOMO email before stopping sequence

**A/B Testing Ideas:**
- Test different "rare question" examples (highest success rate variance questions)
- Test with/without industry customization
- Test CTA copy: "Claim My Report" vs "See My Full Analysis" vs "Unlock My Profile"
- Test final P.S. urgency level (subtle vs stronger)

---

## How to Implement in Netlify Functions

The `send-email.js` function already has templates for emails #1-3. To add Email #4:

1. Query the quiz database for the user's answers
2. Find the question with the LOWEST success rate that they got CORRECT
3. Look up the success rate percentage for that question
4. Identify their highest-scoring category
5. Calculate their percentile rank in that category
6. Render the template with personalized values
7. Send via Resend API

Template variables to track in Google Sheets:
- `QuestionSuccessRates` (reference table: question #, success %)
- `UserCategoryScores` (already tracked)
- `UserCategoryPercentile` (calculate from all users' scores)

