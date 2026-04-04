# Changelog — Practical AI Skills IQ Quiz

## v15.2 / PDF v2.0 — Final Approved Versions (2026-04-04)

### Files in This Release
| File | Version | Location (GitHub) | Location (Mac) |
|------|---------|-------------------|----------------|
| `enhanced-report-preview.html` | v15.2 | `/enhanced-report-preview.html` | `~/Projects/practical-ai-iq-quiz/enhanced-report-preview.html` |
| `enhanced-report.html` | v15.1 | `/enhanced-report.html` | `~/Projects/practical-ai-iq-quiz/enhanced-report.html` |
| `ai-iq-report.pdf` | v2.0 | `/ai-iq-report.pdf` | `~/Projects/practical-ai-iq-quiz/ai-iq-report.pdf` |
| `report.html` | v14.5 | `/report.html` | `~/Projects/practical-ai-iq-quiz/report.html` |

### HTML Report (enhanced-report-preview.html) — v15.2
**Scroll-triggered reveals FIXED — production-ready**
- Fixed critical bug: `setTimeout` batch-reveal was making all sections visible within 2s of load (defeating scroll triggers)
- Only mechanism for reveals is now the Intersection Observer — nothing shows until user scrolls to it
- Score counter (0→78%) fires immediately since it is above the fold
- Breakdown card: bars grow from 0% + counters count up in sync, 280ms stagger between categories
- Insight rows: slide in from left with 200ms stagger when card scrolls into view
- Tip cards: stagger in at 150ms intervals when card scrolls into view
- Day grid cards: stagger in at 200ms intervals
- All original CSS animations preserved: parallaxShift, shimmerText, scorePulse, scoreColor, barShine, ctaFlash

### PDF Report (ai-iq-report.pdf) — v2.0 (complete rebuild)
**Rebuilt from scratch using ReportLab — 5 visually designed pages**

**Page 1:** Dark green header band with gold score circle, gold-accented name, Executive Summary with gold callout stat box, colored progress bars for all 6 categories (green/amber/red with percentage badges)

**Page 2:** Red-to-green benchmark gauge bar with You/Average dot markers, 4-Day course grid (2x2 styled boxes) with Bonus Day 5 callout, pricing with guarantee badges

**Page 3:** Color-coded insight blocks (green/amber/red left-border cards with status pill badges — FIXED text overlap from v1.0), Recommended Next Steps

**Page 4:** Course Highlights 2-column grid (6 feature cards), Pricing box with guarantee badges, full-width dark green CTA with gold "Start Today" button

**Bug Fixed:** v1.0 had text overlap in insight rows where badge label rendered on top of category name. Fixed by using fixed 14mm header area with category label and badge pill in separate vertical positions, tip text starting cleanly below.

---

## v15.1 — Scroll-Triggered Reveal Animations + Staggered Counters (2026-04-04, 2nd session)
**ENHANCEMENT: enhanced-report.html now has full animation system**

### Animation Improvements
- **Scroll-Triggered Reveals:** All `.glass-card.reveal` sections fade in + slide up as user scrolls, powered by Intersection Observer
- **Threshold:** 15% visibility (triggers before section fully enters viewport for smooth UX)
- **Staggered Reveals:** Initial page load triggers staggered reveals at 300ms intervals via setTimeout
- **Preserved CSS Animations:** All original animations remain intact:
  - Glassmorphism blur effects (backdrop-filter: blur(12px))
  - Score ring pulse + color-shift (scorePulse, scoreColor keyframes)
  - Shimmer text effect on user name
  - Progress bar shine effect (barShine: 2.5s infinite)
  - Category row fade-up with individual delays (fadeUp, 100-500ms stagger)
  - CTA button glow pulse (ctaFlash: 3s infinite)

**Why These Changes:**
- Viewers were overwhelmed seeing all data at once
- Staggered reveals create engagement + prevent cognitive overload
- Scroll-triggered animations ensure viewers see effects as content becomes relevant
- User insight: "If all animations trigger at once they lose all their effect since no one sees them"
- Result: Each metric is seen, digested, and reacted to before next one appears

**Technical Details:**
```javascript
// Intersection Observer for scroll-based reveals
function initScrollRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Efficient: stop after first trigger
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -100px 0px' // Trigger slightly before full visibility
  });

  document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
  });
}
```

**Files Updated:**
- `enhanced-report.html` — Added `initScrollRevealAnimations()` function + initialization in DOMContentLoaded
- `enhanced-report-preview.html` — New standalone preview with sample data (for testing animations without URL parameters)

**Best Practice Saved:**
- `feedback_staggered_reveals_best_practice.md` — Documented pattern for all future HTML reports & rich emails
- Pattern includes: counter animations (0→target%), progress bar sync, Intersection Observer setup, timing guidelines (280ms category stagger, 1200ms counter duration)

**Testing Notes:**
- Preview: `enhanced-report-preview.html` — Open directly in browser, scroll down to see all animations trigger
- Production: `enhanced-report.html` — Requires `?data=[base64 quiz results]` URL parameter (used by Netlify Functions)
- All animations should work smoothly; no performance degradation from Intersection Observer

---

## v15.0 — Enhanced HTML Report + v1.0 PDF Report (2026-04-04)
**NEW FILES: enhanced-report.html (HTML) + ai-iq-report.pdf (PDF)**

### 📄 enhanced-report.html (v15.0) — Full-Animation HTML Report
**Local Mac Location:** `~/Projects/practical-ai-iq-quiz/enhanced-report.html`
**GitHub Location:** `github.com/smagnacca/practical-ai-iq-quiz/enhanced-report.html`
**File Size:** 19 KB | **Status:** ✅ Ready for deployment

**What Changed:**
- Added executive summary with WEF 2025-2026 Future of Jobs data (170M jobs created, 88% orgs using AI, only 1-6% mature)
- Highlighted 56% wage premium stat as key motivation
- Added intro paragraphs before each major section (Score Breakdown, How You Compare, Detailed Analysis)
- Added 4-Day Course Highlights section with 2-column grid layout showing Day 1-4 + Bonus Day 5 outcomes
- Strengthened CTA messaging: changed to "You Know the Gap. Now Close It." with greater urgency
- **Preserved ALL original animations:**
  - Glassmorphism card styling intact
  - Scroll-reveal animations (.reveal class + .active state) working
  - Shimmer effects on progress bars active
  - Staggered entrance animations preserved
  - Animated score ring with pulse and color-shift effects
- Converted all new content text to single color with BOLD and italics only (removed colored emphasis)
- Rewrote tone to be conversational/"average American" language (less corporate, more relatable)

**Why This Version:**
- Maintains visual engagement through animations (scroll reveals, shimmer, pulse)
- Adds educational value without sacrificing award-winning design
- Better for web/interactive delivery with modern CSS animations
- User feedback: preserves the excellent animations from original while adding minor surgical content additions

**Production Notes:**
- Enhanced original report.html file (not a redesign — surgical additions only)
- All original CSS animations and JavaScript bindings remain intact
- Data placeholder syntax preserved ([User Name], [Score], [Role], etc.) for dynamic content
- Design follows established Babson brand (green #1B4332, gold #C9A84C, Merriweather + Inter fonts)

### 📑 ai-iq-report.pdf (v1.0) — Professional PDF Report
**Local Mac Location:** `~/Projects/practical-ai-iq-quiz/ai-iq-report.pdf`
**GitHub Location:** `github.com/smagnacca/practical-ai-iq-quiz/ai-iq-report.pdf`
**Generated from:** Node.js docx template (ai-iq-report.docx) → LibreOffice PDF conversion
**File Size:** 84 KB | **Status:** ✅ Ready for distribution

**What's Included:**
- Professional header: title, user info, score at-a-glance
- Executive Summary: 3 paragraphs on AI job market opportunity + personal advantage
- Key Stat Callout: 56% wage premium highlighted in shaded box
- Personal Assessment: how user scores vs. benchmarks
- Detailed Category Breakdown: all 6 AI skills explained with context & importance:
  1. AI Skills Gap Awareness
  2. ROI-First AI
  3. Decision Intelligence
  4. Prompting as a Power Skill
  5. AI Workflow Integration
  6. AI Communication & Persuasion
- Industry Benchmark comparison box
- Roadmap Forward section with strategic guidance
- 4-Day Challenge Details: Day 1-5 outcomes with descriptions
- Next Steps: 4 actionable items (Audit, Calculate, Identify, Join)
- Strong CTA: full-page call-to-action with emphasis on urgency and 56% wage premium target

**Design & Formatting:**
- Professional typography: Arial throughout (universal support)
- Babson brand accent color: #1B4332 (dark green)
- Highlight boxes: #F9F3E9 (light tan background)
- Proper margins, spacing, and page breaks for readability
- Table formatting for stat highlights
- All text single color with bold emphasis where needed
- Production-ready: no animations (PDFs don't support CSS animations)

**Why This Version:**
- No animations in PDF format, so compensated with richer explanatory content
- Better for email distribution (as attachment) and offline reading
- Stronger sales copy and urgency messaging for downloadable version
- More detailed category explanations for comprehensive understanding
- Cleaner for printing
- Standalone report — works independently or pairs with HTML version

**Production Process:**
1. Created Node.js script using `docx` library (docx-js)
2. Designed Word template with proper styles and formatting (ai-iq-report.docx)
3. Converted to PDF via LibreOffice `soffice --headless --convert-to pdf` command
4. Validated PDF rendering, fonts, colors, and layout

**Both Versions Work Together:**
- **HTML (enhanced-report.html):** Animated, interactive, best for web delivery
- **PDF (ai-iq-report.pdf):** Comprehensive, downloadable, best for email/offline
- Complementary deliverables — use based on distribution channel

**Rollback:** If needed, revert to original `report.html` (v14.8) or previous versions via git history

**Next Steps:**
- [ ] Update Netlify Functions to reference enhanced-report.html if needed (test first)
- [ ] Email report delivery: use ai-iq-report.pdf for download link
- [ ] Monitor user feedback on both versions
- [ ] Track engagement metrics (which format users prefer)

---

## v14.5 (2026-04-03)
**DNS: salesforlife.ai domain verification for Resend branded emails**
- Added 4 DNS records in GoDaddy for salesforlife.ai → Resend domain verification:
  - TXT `resend._domainkey` — DKIM public key (RSA 1024-bit)
  - MX `send` → `feedback-smtp.us-east-1.amazonses.com` (Priority 10)
  - TXT `send` — SPF record (`v=spf1 include:amazonses.com ~all`)
  - TXT `_dmarc` — DMARC policy (`v=DMARC1; p=none;`)
- DNS records confirmed saved in GoDaddy (2 pages of records)
- **Pending:** DNS propagation + Resend dashboard verification + update `from` address in send-email.js and check-followups.js
- GitHub + Netlify tokens saved globally to `.claude/tokens/` for auto-push across all sessions

## v14.4 (2026-04-03)
**Port: Email preview designs → production templates (send-email.js + check-followups.js)**
- Ported all 3 personalized email designs from `email-preview.html` into production Netlify Functions
- **Email 1:** Dynamic subject line + header referencing user's strongest category; color-coded inline keywords (green/red/gold/blue)
- **Email 2:** Gap-contrast hook showing best-vs-worst skill gap; urgency CTA with dashed red border; color-coded testimonial
- **Email 3:** Visual category cards with emoji + color-coded borders + percentage scores; dynamic strength/gap counting in intro
- Templates synced across both `send-email.js` (direct sends) and `check-followups.js` (scheduled cron sends)
- All animations converted to static inline CSS for email client compatibility
- Saved animated demo as `Animated-Demo-Practical-AI-IQ-Quiz-Follow-Up-Emails.html` for design reference
- **Resend domain:** salesforlife.ai added to Resend dashboard (DNS records added in v14.5)

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
