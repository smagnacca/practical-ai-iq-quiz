# AI IQ Quiz — Version Locations Reference

**Purpose:** Quick lookup for where each report version is stored (Mac local + GitHub) and how to reference them.

---

## Current Active Versions (Latest)

### HTML Report — v15.0 (2026-04-04)
```
Primary File:     enhanced-report.html
Mac Local:        ~/Projects/practical-ai-iq-quiz/enhanced-report.html
Dated Copy:       ~/Projects/practical-ai-iq-quiz/enhanced-report.html.2026-04-04-v15.0
GitHub:           github.com/smagnacca/practical-ai-iq-quiz/blob/main/enhanced-report.html
Branch:           main
Commit Hash:      9fe088a (pushed 2026-04-04)
```

### PDF Report — v1.0 (2026-04-04)
```
Primary File:     ai-iq-report.pdf
Mac Local:        ~/Projects/practical-ai-iq-quiz/ai-iq-report.pdf
Dated Copy:       ~/Projects/practical-ai-iq-quiz/ai-iq-report.pdf.2026-04-04-v1.0
Generated From:   ai-iq-report.docx (Word template)
GitHub:           github.com/smagnacca/practical-ai-iq-quiz/blob/main/ai-iq-report.pdf
Branch:           main
Commit Hash:      9fe088a (pushed 2026-04-04)
```

---

## Version History

| Date | Type | Version | File | Mac Location | GitHub Status |
|------|------|---------|------|--------------|---------------|
| 2026-04-04 | HTML | v15.0 | enhanced-report.html.2026-04-04-v15.0 | ~/Projects/practical-ai-iq-quiz/ | ✅ main |
| 2026-04-04 | PDF | v1.0 | ai-iq-report.pdf.2026-04-04-v1.0 | ~/Projects/practical-ai-iq-quiz/ | ✅ main |
| 2026-04-03 | HTML | v14.8 | report.html | ~/Projects/practical-ai-iq-quiz/ | ✅ main |

---

## Directory Structure

### Mac Local (`~/Projects/practical-ai-iq-quiz/`)
```
practical-ai-iq-quiz/
│
├── ACTIVE (Current production files)
│   ├── enhanced-report.html ← Use for web delivery
│   ├── ai-iq-report.pdf ← Use for email/download
│   └── report.html (original fallback)
│
├── VERSIONED BACKUPS (dated, for rollback)
│   ├── enhanced-report.html.2026-04-04-v15.0
│   ├── ai-iq-report.pdf.2026-04-04-v1.0
│   └── [previous versions from git history]
│
└── GENERATED (from templates)
    └── ai-iq-report.docx (Word template — source for PDF)
```

### GitHub (`github.com/smagnacca/practical-ai-iq-quiz/`)
```
practical-ai-iq-quiz/
│
├── ACTIVE (main branch)
│   ├── enhanced-report.html
│   ├── ai-iq-report.pdf
│   ├── report.html (fallback)
│   ├── index.html (quiz form)
│   ├── functions/ (Netlify Functions)
│   └── CHANGELOG.md (this versioning doc)
│
└── GIT HISTORY (rollback via commits)
    └── All previous versions accessible via `git log` and `git checkout`
```

---

## How to Access Previous Versions

### From Mac (Local)
```bash
# List all dated versions
ls -la ~/Projects/practical-ai-iq-quiz/*.2026-*

# Use a specific version (example: restore v14.8)
cp ~/Projects/practical-ai-iq-quiz/report.html ~/Projects/practical-ai-iq-quiz/enhanced-report.html
```

### From GitHub (Git History)
```bash
# View commit history for a file
git log --oneline github.com/smagnacca/practical-ai-iq-quiz/enhanced-report.html

# Checkout a previous version by commit hash
git checkout 9fe088a -- enhanced-report.html

# Or revert an entire commit if something broke
git revert 9fe088a
git push origin main
```

---

## Rollback Checklist

If a report version breaks or needs to be reverted:

- [ ] **Identify issue:** Which version? What's broken?
- [ ] **Find previous version:** Check CHANGELOG.md for version info
- [ ] **Restore from Mac local:** `cp [dated-file] [active-file]`
- [ ] **Or restore from GitHub:** `git checkout [commit-hash] -- [file]`
- [ ] **Test thoroughly:** Open file, check all content/formatting/links
- [ ] **Commit rollback:** `git commit -m "Rollback enhanced-report.html to [version]"`
- [ ] **Push:** `git push origin main`
- [ ] **Update CHANGELOG:** Add "Rollback" entry explaining why
- [ ] **Notify:** Document what went wrong for future prevention

---

## File Deployment Map

**When updating Netlify Functions or email templates:**

| Use Case | File | Location | Update Notes |
|----------|------|----------|--------------|
| Web report page | enhanced-report.html | GitHub main | Verify animations work in browser first |
| Email attachment | ai-iq-report.pdf | GitHub main | Test PDF in multiple email clients |
| Fallback report | report.html | GitHub main | Keep as last-resort backup |
| Word template | ai-iq-report.docx | Local only (used to generate PDF) | Update if PDF content changes |

---

## Token/Credentials Storage

- **GitHub PAT:** `~/.claude/tokens/.github_token` (Scott's global tokens)
- **Netlify Token:** `~/.claude/tokens/.netlify_token` (for auto-deploy if needed)
- Status: Tokens set up for auto-push without manual terminal interaction

---

## Notes for Future Versions

When creating a new version:

1. **Update CHANGELOG.md** with what changed and why
2. **Create dated copy:** `cp file.ext file.ext.YYYY-MM-DD-vX.Y`
3. **Update this file:** Add entry to Version History table
4. **Git commit:** `git add . && git commit -m "vX.Y: [description]"`
5. **Git push:** `git push origin main`
6. **Test in production:** Verify Netlify Functions reference correct file
7. **Backup:** Dated copies act as local backup for quick rollback

---

*Last Updated: 2026-04-04 by Claude*
*Maintained by: Scott Magnacca*
*For questions or rollback requests: Check CHANGELOG.md or git history*
