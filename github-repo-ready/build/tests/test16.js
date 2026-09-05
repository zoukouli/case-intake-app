const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;
win.alert = (m) => console.log("ALERT:", m);

setTimeout(async () => {
  try {
    const doc = win.document;

    // ---- Save / resume draft cases ----
    win.goToStep(0);
    win.state.patientName = "Autosave Test Patient";
    win.state.chiefComplaint = "Missing tooth 46";
    win.renderStep(); // triggers autosaveState()

    const saved = win.loadAutosave();
    console.log("Autosave wrote a record once state has meaningful content:", !!saved && saved.state.patientName === "Autosave Test Patient");

    // Simulate reload: fresh state object, same localStorage
    win.resetState();
    win.renderResumeBanner();
    const bannerHtml = doc.getElementById("resumeBanner").innerHTML;
    console.log("Resume banner shows when unsaved work exists:", bannerHtml.includes("Autosave Test Patient"));

    win.resumeAutosave();
    console.log("Resume restores the saved patient name:", win.state.patientName === "Autosave Test Patient");
    console.log("Resume clears the autosave banner:", doc.getElementById("resumeBanner").innerHTML === "");
    // After resuming, renderStep()'s own autosave call re-saves the (now current) work-in-progress —
    // that's correct: autosave should keep tracking the case as the clinician continues, not go blank.
    const afterResume = win.loadAutosave();
    console.log("Autosave keeps tracking the resumed case (no data loss):", !!afterResume && afterResume.state.patientName === "Autosave Test Patient");

    // Explicit "save as draft & start new"
    win.state.patientName = "Draft Patient One";
    win.saveCurrentAsDraft();
    let drafts = win.loadDrafts();
    console.log("Saved-as-draft appears in drafts list:", drafts.length === 1 && drafts[0].label.includes("Draft Patient One"));
    console.log("State reset to blank after saving as draft:", win.state.patientName === "");

    win.openDraft(drafts[0].id);
    console.log("Opening a draft restores its patient name:", win.state.patientName === "Draft Patient One");

    win.deleteDraft(drafts[0].id);
    drafts = win.loadDrafts();
    console.log("Draft deleted:", drafts.length === 0);

    // Reset for the rest of the test
    win.clearAutosave();
    win.resetState();

    // ---- PDF export (offline fallback, since jsdom sandbox has no CDN access) ----
    let alertMsg = "";
    win.alert = (m) => { alertMsg = m; };
    win.exportPdf();
    console.log("exportPdf falls back gracefully when html2pdf isn't loaded:", alertMsg.includes("Print") || alertMsg.includes("internet"));
    console.log("html2pdf is indeed undefined in this offline test env (expected):", typeof win.html2pdf === "undefined");

    // ---- Confirm-before-finish gate on AI flags ----
    win.state.aiFlags = ["sites: heard 'tooth two four or tooth two six, unclear which' - confirm against the recording"];
    win.state.aiFlagsAcknowledged = {};
    win.goToStep(2);
    win.state.procedurePath = win.DATA.leaves[0].path;
    win.goToStep(7); // Review is now index 7 (after Risk indicator was inserted)
    win.buildReview();

    const copyBtn = doc.getElementById("copyReportBtn");
    const printBtn = doc.getElementById("printAllBtn");
    const pdfBtn = doc.getElementById("exportPdfBtn");
    console.log("Copy button disabled while a flag is unacknowledged:", copyBtn.disabled === true);
    console.log("Print button disabled while a flag is unacknowledged:", printBtn.disabled === true);
    console.log("PDF button disabled while a flag is unacknowledged:", pdfBtn.disabled === true);

    const gateHtml = doc.getElementById("flagGate").innerHTML;
    console.log("Gate shows the flagged item text:", gateHtml.includes("tooth two four"));

    win.toggleFlagAck(0);
    console.log("Copy button re-enabled once the flag is ticked:", doc.getElementById("copyReportBtn").disabled === false);
    console.log("Print button re-enabled once the flag is ticked:", doc.getElementById("printAllBtn").disabled === false);

    win.toggleFlagAck(0);
    console.log("Un-ticking re-disables the buttons:", doc.getElementById("copyReportBtn").disabled === true);

    // No flags at all -> gate stays out of the way, buttons enabled
    win.state.aiFlags = [];
    win.state.aiFlagsAcknowledged = {};
    win.buildReview();
    console.log("No flags -> gate empty:", doc.getElementById("flagGate").innerHTML === "");
    console.log("No flags -> buttons enabled:", doc.getElementById("copyReportBtn").disabled === false);

    console.log("ALL TEST16 (SAVE/RESUME + PDF EXPORT + FLAG GATE) CHECKS DONE");
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}, 800);
