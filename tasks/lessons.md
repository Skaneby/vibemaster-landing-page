# Lessons Learned

Patterns and fixes to remember across sessions.

---

## Tailwind CSS (v4 CLI standalone)

**Lesson**: Always rebuild `output.css` after adding new Tailwind classes to HTML.
The binary scans the HTML at build time — new classes won't appear in CSS until rebuilt.

**Build command**:
```
./tailwindcss -i src/styles/input.css -o src/styles/output.css --minify
```

**Binary**: gitignored. Download if missing:
```
curl -sL https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-arm64 -o tailwindcss && chmod +x tailwindcss
```

**Custom classes** go in `src/styles/input.css` using `@utility` directive (v4 syntax), NOT in `tailwind.config.js`.

---

## Header / Navbar

**Lesson**: The glassmorphism `glass` utility (`bg-white/[0.03]`) is nearly invisible over bright images.
Use inline style `background: rgba(2, 6, 23, 0.95)` on the fixed header for reliable contrast over any section.

---

## Mobile navigation

**Lesson**: When hiding the desktop nav with `hidden md:flex`, always add a hamburger fallback for mobile.
Without it, users on phones have no way to navigate sections.

**Pattern used**: Hamburger button with `md:hidden`, mobile nav div with `hidden md:hidden` (JS removes `hidden` on toggle, `md:hidden` re-hides at desktop breakpoints automatically).

---

## i18n

**Lesson**: New HTML elements with `data-i18n` attributes are automatically picked up — no JS changes needed, only add the key to all 7 language objects in `src/scripts/i18n.js`.

---

## Git / GitHub

**Lesson**: No `gh` CLI installed. Use `git` directly or GitHub REST API via `curl` for repo operations.
`output.css` IS committed (unlike typical projects) — required for GitHub Pages static serving without a build step.
