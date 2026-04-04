#!/usr/bin/env python3
"""
ReportLab PDF Generator for Practical AI Skills IQ Quiz
Generates personalized PDFs with quiz results, insights, and course recommendations.

Usage:
  python3 generate-pdf.py <base64_quiz_data> <output_filename>

  or from Node.js:
  const result = require('child_process').spawnSync('python3', [
    'generate-pdf.py',
    base64Data,
    outputPath
  ]);
"""

import sys
import json
import base64
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm, inch
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ─────────────────────────────────────────────────────────────
# COLORS & DESIGN SYSTEM
# ─────────────────────────────────────────────────────────────
BABSON_GREEN = HexColor('#006644')
GREEN_DARK = HexColor('#1B4332')
GREEN_MID = HexColor('#0A5C38')
GOLD = HexColor('#C9A84C')
GOLD_LIGHT = HexColor('#E8C96A')
MANGO = HexColor('#EEAF00')
DANGER = HexColor('#C0392B')
SUCCESS = HexColor('#27AE60')
SUMMER_NIGHTS = HexColor('#005172')
CEDAR_KEY = HexColor('#DAD7CB')
CREAM = HexColor('#FAFAF7')
WHITE = HexColor('#FFFFFF')
TEXT_DARK = HexColor('#2D3748')
TEXT_LIGHT = HexColor('#4A5568')

# ─────────────────────────────────────────────────────────────
# CATEGORY TIPS (same as HTML)
# ─────────────────────────────────────────────────────────────
CATEGORY_TIPS = {
    "AI Skills Gap Awareness": {
        "strength": "You're already ahead in recognizing where AI can add value. Keep auditing your workflow quarterly.",
        "improve": "You have a solid foundation but need to systematically identify AI opportunities. Try mapping tasks by time spent.",
        "gap": "Start with: list top 10 weekly tasks, rank by repetitiveness (1-10), research one AI tool for each task scoring 7+."
    },
    "ROI-First AI": {
        "strength": "Your ROI thinking is sharp. Apply this rigor to every new tool evaluation.",
        "improve": "Practice: (Hours Saved × Hourly Cost × 4.33) - Tool Cost = Monthly ROI. Always include indirect savings.",
        "gap": "Track time on top 5 tasks. Research AI for the most time-consuming. Calculate time savings × hourly rate."
    },
    "Decision Intelligence": {
        "strength": "Excellent judgment in knowing when to trust AI. This is one of the most valuable skills.",
        "improve": "Formalize your oversight: (1) What data did AI have? (2) What context is missing? (3) Cost of wrong decision?",
        "gap": "Key principle: AI excels at patterns in data but misses context. Always ask: 'What does the AI NOT know?'"
    },
    "Prompting as Power Skill": {
        "strength": "Advanced skills. You understand specificity, context, structure dramatically improve output.",
        "improve": "Level up: chain-of-thought, few-shot examples, role assignment ('act as expert X').",
        "gap": "The 'Specificity Stack': Who is audience? Format? Tone? Length? Examples? Include ALL in every prompt."
    },
    "AI Workflow Integration": {
        "strength": "Systematic thinking about AI in workflows. This architectural thinking is rare and valuable.",
        "improve": "Pick your most painful workflow. Map step-by-step. Find highest-impact AI integration point.",
        "gap": "Start simple: pick ONE workflow (e.g., reporting). Map every step. Find manual handoffs—that's your AI opportunity."
    },
    "AI Communication & Persuasion": {
        "strength": "You know how to build trust around AI. This is a leadership skill.",
        "improve": "Structure: (1) Acknowledge concern, (2) Explain your human+AI process, (3) Show ROI example, (4) Low-risk pilot.",
        "gap": "People distrust lack of process, not AI. Lead with 'Here's how I validate AI output' before showing AI work."
    }
}

INDUSTRY_BENCHMARKS = {
    "Technology": 62, "Finance / Banking": 55, "Healthcare": 48,
    "Education": 51, "Marketing / Advertising": 58, "Consulting": 60,
    "Manufacturing": 44, "Retail / E-commerce": 52, "Legal": 42,
    "Real Estate": 46, "Government / Public Sector": 39, "Nonprofit": 43,
    "Other": 50
}

# ─────────────────────────────────────────────────────────────
# DECODE QUIZ DATA
# ─────────────────────────────────────────────────────────────
def decode_quiz_data(base64_str):
    """Decode base64 quiz result object."""
    try:
        json_str = base64.b64decode(base64_str).decode('utf-8')
        return json.loads(json_str)
    except Exception as e:
        print(f"Error decoding data: {e}", file=sys.stderr)
        return None

# ─────────────────────────────────────────────────────────────
# PDF GENERATION
# ─────────────────────────────────────────────────────────────
def generate_pdf(data, output_path):
    """Generate personalized PDF report."""

    # Extract data
    name = data.get('firstName', 'Professional')
    email = data.get('email', '')
    industry = data.get('industry', 'Technology')
    score = data.get('score', 0)
    total_correct = data.get('totalCorrect', 0)
    total_questions = data.get('totalQuestions', 15)
    cats = data.get('cats', {})

    # Create PDF
    c = canvas.Canvas(output_path, pagesize=letter)
    page_w, page_h = letter
    margin = 20 * mm

    # ─────────────────────────────────────────────────────────────
    # PAGE 1: HEADER + SCORE + EXECUTIVE SUMMARY
    # ─────────────────────────────────────────────────────────────
    y = page_h - 20 * mm

    # Header bar (dark green)
    c.setFillColor(SUMMER_NIGHTS)
    c.rect(0, page_h - 50 * mm, page_w, 50 * mm, fill=1)

    # Gold accent circle for score
    score_circle_x = page_w - 60 * mm
    score_circle_y = page_h - 60 * mm
    c.setFillColor(GOLD)
    c.circle(score_circle_x, score_circle_y, 20 * mm, fill=1)

    # Score text in circle
    c.setFont("Helvetica-Bold", 32)
    c.setFillColor(WHITE)
    c.drawCentredString(score_circle_x, score_circle_y + 4 * mm, f"{score}%")

    # Header text
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(WHITE)
    c.drawString(margin, page_h - 30 * mm, "AI Skills IQ Report")

    c.setFont("Helvetica", 11)
    c.setFillColor(GOLD)
    c.drawString(margin, page_h - 38 * mm, f"Prepared for {name}")

    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor('#CCCCCC'))
    c.drawString(margin, page_h - 43 * mm, f"{industry} • {email}")

    y = page_h - 55 * mm

    # Executive Summary box
    c.setFillColor(HexColor('#F9F3E9'))
    c.rect(margin, y - 45 * mm, page_w - 2 * margin, 40 * mm, fill=1, stroke=0)

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(GREEN_DARK)
    c.drawString(margin + 5 * mm, y - 8 * mm, "Executive Summary")

    c.setFont("Helvetica", 9)
    c.setFillColor(TEXT_LIGHT)
    summary_y = y - 14 * mm
    c.drawString(margin + 5 * mm, summary_y, f"You scored {score}% with {total_correct} of {total_questions} correct.")
    c.drawString(margin + 5 * mm, summary_y - 5 * mm, f"This places you {('above' if score > 60 else 'below')} average for {industry} professionals.")
    c.drawString(margin + 5 * mm, summary_y - 10 * mm, "Professionals closing their AI skills gap see a 56% wage premium (PwC, 2025).")

    y = y - 50 * mm

    # Category breakdown bars
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(GREEN_DARK)
    c.drawString(margin, y, "Your Score Breakdown")

    y -= 8 * mm

    cat_entries = sorted(cats.items())
    for i, (cat_name, cat_data) in enumerate(cat_entries):
        if y < margin + 40 * mm:
            c.showPage()
            y = page_h - margin

        correct = cat_data.get('correct', 0)
        total = cat_data.get('total', 5)
        pct = round(correct / total * 100)

        # Category label
        c.setFont("Helvetica", 9)
        c.setFillColor(TEXT_DARK)
        c.drawString(margin, y, f"{cat_name}: {pct}%")

        # Progress bar
        bar_w = 120 * mm
        bar_h = 6 * mm
        c.setFillColor(HexColor('#EEEEEE'))
        c.rect(margin, y - bar_h, bar_w, bar_h, fill=1)

        # Colored fill
        if pct >= 80:
            bar_color = SUCCESS
        elif pct >= 50:
            bar_color = MANGO
        else:
            bar_color = DANGER

        c.setFillColor(bar_color)
        c.rect(margin, y - bar_h, bar_w * (pct / 100), bar_h, fill=1)

        y -= 10 * mm

    # ─────────────────────────────────────────────────────────────
    # PAGE 2: BENCHMARK + COURSE + PRICING
    # ─────────────────────────────────────────────────────────────
    c.showPage()
    y = page_h - margin

    # Benchmark
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(GREEN_DARK)
    c.drawString(margin, y, "How You Compare")
    y -= 8 * mm

    avg = INDUSTRY_BENCHMARKS.get(industry, 50)
    c.setFont("Helvetica", 9)
    c.setFillColor(TEXT_LIGHT)
    c.drawString(margin, y, f"vs. {industry} Average: {avg}%")
    y -= 8 * mm

    # Benchmark bar
    bar_w = 140 * mm
    bar_h = 8 * mm
    c.setFillColor(DANGER)
    c.rect(margin, y - bar_h * 0.5, bar_w * 0.3, bar_h, fill=1)
    c.setFillColor(MANGO)
    c.rect(margin + bar_w * 0.3, y - bar_h * 0.5, bar_w * 0.4, bar_h, fill=1)
    c.setFillColor(SUCCESS)
    c.rect(margin + bar_w * 0.7, y - bar_h * 0.5, bar_w * 0.3, bar_h, fill=1)

    # Markers
    you_pos = margin + bar_w * (score / 100)
    avg_pos = margin + bar_w * (avg / 100)

    c.setFillColor(BABSON_GREEN)
    c.circle(you_pos, y - bar_h * 1.5, 3 * mm, fill=1)
    c.setFont("Helvetica", 7)
    c.drawCentredString(you_pos, y - bar_h * 2.5, f"You ({score}%)")

    c.setFillColor(MANGO)
    c.circle(avg_pos, y + bar_h * 0.5, 3 * mm, fill=1)
    c.drawCentredString(avg_pos, y + bar_h * 1.5, f"Avg ({avg}%)")

    y -= 15 * mm

    # 4-Day Course Grid
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(GREEN_DARK)
    c.drawString(margin, y, "The 4-Day AI Skills Challenge")
    y -= 8 * mm

    courses = [
        ("Day 1", "The AI Skills Gap Audit"),
        ("Day 2", "ROI-First AI"),
        ("Day 3", "Decision Intelligence"),
        ("Day 4", "Prompting as Power Skill")
    ]

    col_w = (page_w - 2 * margin) / 2
    col_h = 18 * mm

    for idx, (day, title) in enumerate(courses):
        row = idx // 2
        col = idx % 2
        box_x = margin + col * col_w + 5 * mm
        box_y = y - row * (col_h + 5 * mm)

        c.setFillColor(HexColor('#E8F5E9'))
        c.setStrokeColor(GREEN_MID)
        c.rect(box_x, box_y - col_h, col_w - 10 * mm, col_h, fill=1, stroke=1)

        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(GREEN_DARK)
        c.drawString(box_x + 3 * mm, box_y - 5 * mm, day)

        c.setFont("Helvetica", 8)
        c.drawString(box_x + 3 * mm, box_y - 10 * mm, title)

    y -= 50 * mm

    # Pricing CTA
    c.setFillColor(GREEN_DARK)
    cta_h = 20 * mm
    c.rect(margin, y - cta_h, page_w - 2 * margin, cta_h, fill=1)

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(WHITE)
    c.drawCentredString(page_w / 2, y - 8 * mm, "Ready to Master AI Skills?")

    c.setFont("Helvetica", 9)
    c.drawCentredString(page_w / 2, y - 14 * mm, "Join hundreds of professionals closing their AI skills gap.")

    # ─────────────────────────────────────────────────────────────
    # PAGE 3: DETAILED INSIGHTS
    # ─────────────────────────────────────────────────────────────
    c.showPage()
    y = page_h - margin

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(GREEN_DARK)
    c.drawString(margin, y, "Detailed Category Analysis")
    y -= 10 * mm

    HEADER_H = 14 * mm  # Fixed header zone

    for cat_name, cat_data in cat_entries:
        if y < margin + 40 * mm:
            c.showPage()
            y = page_h - margin

        correct = cat_data.get('correct', 0)
        total = cat_data.get('total', 5)
        pct = round(correct / total * 100)

        # Determine level and colors
        if pct >= 80:
            level = "Strength"
            icon = "⭐"
            border_color = SUCCESS
            bg_color = HexColor('#E8F5E9')
        elif pct >= 50:
            level = "Room to Improve"
            icon = "⚡"
            border_color = MANGO
            bg_color = HexColor('#FFF8E1')
        else:
            level = "Key Opportunity"
            icon = "🎯"
            border_color = DANGER
            bg_color = HexColor('#FFEBEE')

        # Card with left border
        card_h = HEADER_H + 20 * mm
        c.setFillColor(bg_color)
        c.setStrokeColor(HexColor('#DDDDDD'))
        c.rect(margin, y - card_h, page_w - 2 * margin, card_h, fill=1, stroke=1)

        # Left border accent
        c.setFillColor(border_color)
        c.rect(margin, y - card_h, 4 * mm, card_h, fill=1)

        # Header zone
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(GREEN_DARK)
        c.drawString(margin + 6 * mm, y - 6 * mm, f"{cat_name} — {pct}% ({level})")

        # Badge pill
        pill_x = page_w - margin - 30 * mm
        c.setFillColor(border_color)
        c.rect(pill_x, y - 10 * mm, 28 * mm, 6 * mm, fill=1, stroke=0)

        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(WHITE)
        c.drawCentredString(pill_x + 14 * mm, y - 7 * mm, level.upper())

        # Tip text (starts below header)
        tip = CATEGORY_TIPS.get(cat_name, {}).get(
            "strength" if pct >= 80 else "improve" if pct >= 50 else "gap",
            "Focus on this area."
        )

        c.setFont("Helvetica", 8)
        c.setFillColor(TEXT_LIGHT)
        tip_y = y - HEADER_H - 3 * mm
        c.drawString(margin + 6 * mm, tip_y, tip)

        y -= (card_h + 5 * mm)

    # ─────────────────────────────────────────────────────────────
    # PAGE 4: NEXT STEPS + FINAL CTA
    # ─────────────────────────────────────────────────────────────
    c.showPage()
    y = page_h - margin

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(GREEN_DARK)
    c.drawString(margin, y, "Your Recommended Next Steps")
    y -= 10 * mm

    steps = [
        ("This Week", "Focus on your biggest opportunity area. Spend 30 minutes researching one AI tool that addresses your weakest skill."),
        ("This Month", "Apply AI to one real work task per day. Track time saved and quality improvements."),
        ("This Quarter", "Consider formal training to accelerate your growth. The 4-Day AI Skills Challenge is designed for professionals at your level.")
    ]

    for step_title, step_desc in steps:
        if y < margin + 40 * mm:
            c.showPage()
            y = page_h - margin

        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(BABSON_GREEN)
        c.drawString(margin, y, step_title)
        y -= 6 * mm

        c.setFont("Helvetica", 8)
        c.setFillColor(TEXT_LIGHT)
        c.drawString(margin + 5 * mm, y, step_desc)
        y -= 12 * mm

    y -= 5 * mm

    # Final CTA
    c.setFillColor(GREEN_DARK)
    c.rect(margin, y - 30 * mm, page_w - 2 * margin, 30 * mm, fill=1)

    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(WHITE)
    c.drawCentredString(page_w / 2, y - 10 * mm, "Close Your AI Skills Gap")

    c.setFont("Helvetica", 9)
    c.setFillColor(GOLD)
    c.drawCentredString(page_w / 2, y - 16 * mm, "Join the 4-Day AI Skills Challenge")

    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#CCCCCC'))
    c.drawCentredString(page_w / 2, y - 22 * mm, "Visit: 4daycourse.netlify.app")

    # Footer
    c.setFont("Helvetica", 7)
    c.setFillColor(HexColor('#999999'))
    c.drawString(margin, margin, "© 2026 Practical AI Skills IQ. Personalized report generated for educational purposes.")

    # Save
    c.save()
    print(f"PDF saved: {output_path}")

# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: generate-pdf.py <base64_data> <output_path>", file=sys.stderr)
        sys.exit(1)

    base64_data = sys.argv[1]
    output_path = sys.argv[2]

    data = decode_quiz_data(base64_data)
    if not data:
        print("Failed to decode quiz data", file=sys.stderr)
        sys.exit(1)

    try:
        generate_pdf(data, output_path)
        print("OK")
    except Exception as e:
        print(f"Error generating PDF: {e}", file=sys.stderr)
        sys.exit(1)
