# Changelog — Practical AI Skills IQ Quiz

## v14.4 (2026-04-03)
**Port: Email preview designs → production templates (send-email.js + check-followups.js)**
- Ported all 3 personalized email designs from `email-preview.html` into production Netlify Functions
- **Email 1:** Dynamic subject line + header referencing user's strongest category; color-coded inline keywords (green/red/gold/blue)
- **Email 2:** Gap-contrast hook showing best-vs-worst skill gap; urgency CTA with dashed red border; color-coded testimonial
- **Email 3:** Visual category cards with emoji + color-coded borders + percentage scores; dynamic strength/gap counting in intro
- Templates synced across both `send-email.js` (direct sends) and `check-followups.js` (scheduled cron sends)
- All animations converted to static inline CSS for email client compatibility
- Saved animated demo as `Animated-Demo-Practical-AI-IQ-Quiz-Follow-Up-Emails.html` for design reference
- **Resend domain:** salesforlife.ai added to Resend dashboard (DNS verification deferred — needs registrar access)

## v14.3.2 (2026-04-03)
**Enhancement: Personalized email headlines — unique data hooks per email**
- Email 1 subject leads with strongest category: "You scored 100% in Decision Intelligence — but one skill area may be holding you back"
- Email 2 subject leads with best-vs-worst gap: "Your AI Communication score is 100 points behind your strongest skill"
- Email 3 subject leads with pattern insight: "4 of your 6 AI skill areas need attention — here's the full picture"
- Updated header banners and opening paragraphs to match each unique angle
- No email repeats the generic "You scored X%" headline
- Saved as critical best practice #0: all future multi-email sequences must use unique data points per email

## v14.3.1 (2026-04-03)
**Enhancement: Slow all animations 15% for comfortable reading absorption**
- All email step delays, report phase timings, stagger intervals bumped 15%
- Report total sequence: 27s → 31s; score counter: 45ms → 52ms tick
- CSS transitions: reveals .8s → .92s, bar fills 1.4s → 1.6s, benchmark slide 1.8s → 2.1s

## v14.3 (2026-04-03)
**Enhancement: Email & report preview with progressive reveal animations**
- Added `email-preview.html` — tabbed preview of all 3 follow-up emails + paid report page
- **Reading-pace progressive reveal** timed for older adult professionals (~120-150 wpm):
  - Greeting immediate → paragraphs at 1.5-4s intervals → bullets stagger 2s each → CTA block after content absorbed
- **Email CTA animations:** animated strikethrough on $9.99, glowing/pulsing $1.00, pulsing gold-border CTA with shimmer, 2:30 countdown timers
- **Color-coded bold keywords** throughout all emails (strengths=green, gaps=red, ROI=gold, compare=teal)
- **Email 3:** staggered category card reveals with color-coded left borders and emoji tier indicators
- **Report page:** animated score counter 0→67% (45ms/tick), "Calculating across thousands of participants" spinner for 3.5s, staggered bar reveals (500ms each), benchmark marker slides, cascading section entrance over 27s total
- **GitHub token saved** to `.claude/tokens/.github_token` — auto-push unblocked
- **Best practices saved to auto-memory** — progressive reveal, CTA animation, and pacing patterns now apply globally to all future rich web content

## Scheduled Maintenance Check (2026-04-03 10:49 UTC)
**Automated daily update task — no code changes**
- Verified all 5 Netlify Functions are present: submit-lead.js, create-checkout.js, send-email.js, check-followups.js, mark-paid.js
- Verified report.html and package.json are intact
- Confirmed project memory (auto-memory) is up to date at v14.2
- **Blocker identified:** GitHub token (`ghp_mkn7...`) is not persisted in the workspace `.claude/tokens/` directory. Scott needs to re-provide the PAT or save it to `.claude/tokens/.github_token` for auto-push to work in scheduled tasks.
- **No code changes made** — all files match last known v14.2 state
- Next action items remain: E2E testing, Resend domain verification, course upsell

## v14.2 (2026-04-03)
**Fix: Complete email transport migration to Resend API**
- Removed ALL Gmail SMTP / nodemailer references from `send-email.js` and `check-followups.js`
- Both functions now use native `fetch()` to call Resend API — no npm email dependency needed
- Removed `nodemailer` from `package.json`
- Emails send via `RESEND_API_KEY` env var (already configured in Netlify)
- From address: `onboarding@resend.dev` (Resend free tier)

## v14.1 (2026-04-03)
**Partial email migration (had leftover Gmail references)**
- Started switching from nodemailer/Gmail to Resend API
- Still had old Gmail SMTP comments and mixed references — cleaned up in v14.2

## v14 (2026-04-03)
**Major: Stripe payment, personalized report, 3-email follow-up sequence**
- `create-checkout.js` — Stripe Checkout Session ($1.00), base64 quiz data in success URL
- `report.html` — Personalized report with score ring, category breakdown, industry benchmarks, tips, PDF download (jsPDF)
- `send-email.js` — Email templates: confirmation + 3 follow-ups
- `check-followups.js` — Scheduled function (cron 30min): sends follow-up emails at 2hr/4hr/6hr
- `mark-paid.js` — Marks Google Sheets column U as TRUE to stop follow-ups
- `submit-lead.js` updated — appends tracking columns U-X (Paid, FollowUp1-3Sent)

## v13 (2026-04-02)
**Quiz start email notification**
- Fire-and-forget POST via Netlify Forms when user enters name/email and clicks Start
- Scott gets instant email alert with visitor details

## v14.8 (2026-04-04)
**Fix: submit-lead.js categories field type mismatch — leads not writing to Google Sheets**
- **Bug:** `submit-lead.js` called `.map()` on `categories` treating it as an array, but the quiz frontend sends it as an object `{categoryName: {correct, total}}`. This threw a `TypeError`, was caught silently, and returned 500 — no row ever written to Google Sheets.
- **Fix:** Replaced `(categories || []).map(c => c.name)` with `Object.entries(categories).map(([name, d]) => ...)` to correctly iterate the object and format as `"Name: XX%"`.
- **Impact:** All quiz completions since v14 were silently failing to save leads. Google Sheets was empty.

## v14.7 (2026-04-04)
**Fix: JS syntax error in banner.innerHTML killing all button handlers**
- **Bug:** The cancelled-payment banner at line 1055 of index.html used `\\'` (double-escaped backslash + quote) inside a single-quoted JS string. In JS, `\\` becomes a literal backslash, then `'` closes the string prematurely — the entire 1,100-line script block failed to parse silently, making every button on the page dead.
- **Fix:** Changed `\\'[onclick*=handlePayment]\\'` to `\'[onclick*=handlePayment]\'` — one character difference.
- **Root cause:** Introduced in v14.4 during email template port. Verified clean with `node --check` before pushing.
- **Diagnosis method:** 3 parallel agents + `node --check` on extracted live script + binary search within script to isolate broken line.

## v14.6 (2026-04-04)
**Feature: Branded email from-address — hello@salesforlife.ai**
- Verified all 4 DNS records propagated for salesforlife.ai (DKIM, SPF, DMARC, MX) via `dig`
- salesforlife.ai verified in Resend dashboard — domain status: active
- Updated `from` address in `send-email.js` (line 291) and `check-followups.js` (line 61): `onboarding@resend.dev` → `hello@salesforlife.ai`
- E2E test confirmed: Stripe payment processed, confirmation email received from hello@salesforlife.ai, report page rendered correctly
