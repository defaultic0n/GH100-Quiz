# GH100-FlashCard — Regeneration Checklist (FULL-FIX Baseline)

Baseline build: GH100-FlashCard-FULL-FIX.zip  
Source of questions: GH-100 GitHub Admin Cert Exam QnA.docx (yellow highlight = correct answers)

## 1) Golden Rules (to avoid breaking the app)
- **index.html** = HTML ONLY (never paste JSON here)
- **app.js** = JavaScript ONLY (never paste JSON here)
- **cards.json** = DATA ONLY JSON (never paste JS here)
- Keep all files in the **repo root** (no subfolders), otherwise GitHub Pages may show 404.

## 2) Files that should exist in repo root (must match exactly)
- index.html
- styles.css
- app.js
- cards.json
- service-worker.js
- manifest.json
- icons/icon-192.png
- icons/icon-512.png
- README.md

## 3) How to update / add questions safely (recommended workflow)
### Option A (preferred): Update the DOCX, then regenerate cards.json
1. Edit **GH-100 GitHub Admin Cert Exam QnA.docx**
2. Add new questions in the same format:
   - Question line
   - Options as bullet points
   - Highlight correct option(s) in **yellow**
3. Regenerate the app package using the “Reusable Prompt” below.

### Option B (quick): Edit cards.json directly (only if confident)
- Add a new object inside `cards[]`
- Use correct JSON commas and quotes
- Ensure options use:
  `{ "text": "...", "isCorrect": true/false }`
- Ensure answers contain actual answer text (not letters like "A/B/C")

## 4) Publishing steps (GitHub Pages)
1. Upload / replace files **in repo root**
2. Repo → Settings → Pages → Deploy from **main / root**
3. If changes do not appear:
   - Hard refresh (Ctrl+Shift+R) OR clear site data on phone
   - Ensure service worker cache version is bumped (next section)

## 5) IMPORTANT: Make updates always show (Service Worker cache bump)
Every time you publish a new version:
- Open `service-worker.js`
- Change:
  `const CACHE_NAME = '...';`
  to a NEW value, e.g. `gh100-flashcards-fullfix-v2`, then commit.
This forces GitHub Pages/PWA clients to load the latest build.

## 6) Reusable Prompt (Copy & Paste)
Use this prompt to recreate the FULL-FIX app from the DOCX:

Create a complete static GitHub Pages PWA flashcard app (no build tools) from my attached DOCX.

INPUT
- File: GH-100 GitHub Admin Cert Exam QnA.docx
- Correct answers are the options highlighted in yellow.

OUTPUT
- Provide a ZIP containing ONLY these files at repo root:
  index.html, styles.css, app.js, cards.json, service-worker.js, manifest.json, icons/icon-192.png, icons/icon-512.png, README.md
- cards.json MUST be DATA ONLY (no JS). app.js MUST be JS only (no JSON). index.html MUST be HTML only.

APP FEATURES (match FULL-FIX baseline)
- Mobile-friendly dark UI, flip card.
- Bottom navigation: Prev / Flip(or Reveal) / Submit (quiz) / Next ABOVE “I got it / I missed”.
- Toggle: Shuffle questions, Shuffle answers (reshuffle on navigation), Only missed, Quiz mode.
- Quiz mode: tap option(s), auto-submit for single-answer, Submit button for multi-answer, show correct/incorrect feedback.
- Track progress locally (correct/wrong counts), Only missed uses wrong>0.
- Update banner: “New version available” + Refresh; service worker supports SKIP_WAITING + cache version bump.

DEPLOYMENT
- Works on GitHub Pages project site under /<repo>/ using relative paths only.
- Bump CACHE_NAME in service-worker.js so updates publish cleanly.


  ===========================================================================================

# GH100-FlashCard (FULL FIX)

This folder contains a complete static PWA for GitHub Pages.

## Fixes included
- index.html is valid HTML
- cards.json is DATA ONLY (questions/options/answers)
- app.js contains the application logic (quiz + flashcards)
- shuffle questions + shuffle answers (reshuffles on navigation)
- bottom navigation controls
- update banner for new deployments

## Deploy
Upload all files in this folder to your repo root and enable GitHub Pages (main / root).

Cache name: gh100-flashcards-fullfix-v1
Cards: 41
