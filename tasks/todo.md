# Vibemaster Landing Page — Todo

## Status legend
- [ ] pending
- [x] done
- [~] commented out / paused

---

## Done
- [x] Set up project structure (vanilla HTML/CSS/JS)
- [x] Integrate Google Stitch design exports (hero + pricing sections)
- [x] i18n support: EN, SV, DE, ES, HI, ZH, FR (auto-detected from browser)
- [x] Integrations bar: Lovable, Replit, Bolt, Claude, Google Studio, Antigravity, Cursor, VS Code
- [x] Link all CTAs to https://vibemaster.osc-fr1.scalingo.io/
- [x] EU Compliance section (GDPR, AI Act, Data Residency, Privacy by Design)
- [x] Replace Tailwind CDN with locally built CSS (Tailwind CLI v4 standalone)
- [x] Add SVG favicon (indigo brand color)
- [x] Responsive design pass: mobile hamburger nav, mock UI truncation, CTA fixes
- [x] Navbar opacity fix (0.95) — readable over bright image in Problem section
- [~] Testimonials section — commented out, activate when real quotes available

---

## Pending

### Content
- [ ] Fill in real testimonial quotes (3 customers) — then uncomment section
- [ ] Verify pricing is final ($0 / $29 / $99) or update to correct values
- [ ] Expand FAQ answers (currently placeholder text)
- [ ] Update mock UI URL from `bridge.vibe-researcher.ai` to actual domain

### Design / Brand
- [ ] Replace `link` Material Icon with real Vibemaster logotype if available
- [ ] Decide on and set custom domain (GitHub Pages supports CNAME)

### Technical
- [ ] Set up GitHub Pages deployment from `development` branch
- [ ] Add CNAME file when custom domain is confirmed
- [ ] Add basic analytics (Plausible / Fathom — privacy-friendly, EU-based)

### Nav
- [ ] "Reviews" nav link points to `#testimonials` which is hidden — hide or redirect when testimonials are off
