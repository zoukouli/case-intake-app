# Case Intake & Documentation Assistant

A single-file web app for the Dental Implant Registry (DIR) that lets a clinician dictate a case, then generates the clinician report, materials list, quotation, day-surgery summary, perioperative-medication guidance, and a literature-informed patient risk indicator — all from the same intake.

## Quick start

Open `Case_Intake_App.html` directly in a browser. No server or build step required to *use* it — it's a fully self-contained HTML file.

## Repo layout

- `Case_Intake_App.html` — the built, ready-to-use app (single file, generated — see Build below).
- `app_data.json` — procedure/implant/graft/anaesthetic reference data consumed by the app.
- `med_data.json` — perioperative medication ruleset (drug classes, aliases, bleed-risk guidance).
- `build/` — source files the built app is generated from:
  - `app_shell.html` — page skeleton, CSS, and the two placeholder tags (`__APP_DATA__`, `__APP_JS__`) filled in at build time.
  - `app_logic.js` — all application logic (state, rendering, AI dictation-fill, risk scoring, exports).
  - `combine.py` — assembles `app_shell.html` + `app_logic.js` + the JSON data files into `Case_Intake_App.html`.
  - `build_med_data.py` — builds `med_data.json` from the underlying drug_classes/drug_aliases source rules.
  - `package.json` / `package-lock.json` — dev dependency (`jsdom`) used only for the test suite.
  - `tests/` — jsdom-based regression tests (`test*.js`), run against the built `Case_Intake_App.html`.

## Building

```
cd build
python3 combine.py
```

This regenerates `Case_Intake_App.html` at the repo root from the current shell/logic/data files.

## Testing

```
cd build
npm install
node tests/test17.js   # example: run a single test file
```

Each `test*.js` file loads the built HTML into a headless jsdom DOM, drives the app's exposed `window.*` functions, and prints pass/fail lines to the console. There is no single test runner yet — each file is run individually with `node`.

## Key features

- **Guided dictation**: browser speech-to-text plus an AI fill step (Claude Haiku) that populates structured fields from the transcript, with a transparent corrections/flags review step gating copy/print/export until acknowledged.
- **Per-section copy-to-EHR**: each output panel (report, materials, quote, day surgery, perioperative, risk indicator) has its own copy button so clinicians can paste only what they need.
- **Save/resume drafts**: autosave plus named drafts, both stored in the browser's local storage.
- **PDF export**: client-side, via html2pdf.js, with an offline-safe fallback.
- **Perioperative medication guidance**: matches dictated/entered medications against a drug-class ruleset and flags continue/hold/stop status with sourcing.
- **Patient risk indicator (v0.1)**: a literature-informed, points-based composite score across nine risk factors. This is an interim placeholder model — see the in-app caveats section and `build/app_logic.js`'s `RISK_MODEL` constant for sourcing and known limitations. **Not yet through Scientific Committee / Ethics review — not for use on real patients until that review is complete.**

## Status

Pilot / development tool for the Dental Implant Registry. Not a certified medical device. The risk indicator in particular uses provisional, literature-derived weights rather than DIR-fitted coefficients and is pending formal review (see caveats in-app).
