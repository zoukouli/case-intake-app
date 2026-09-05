const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;
win.alert = (m) => console.log("ALERT:", m);
win.prompt = () => "sk-ant-test-fake-key";

setTimeout(async () => {
  try {
    const doc = win.document;

    // 1. Prompt content includes the new safety rule + schema keys
    const promptText = win.buildAiPrompt("test transcript");
    console.log("Prompt includes SAFETY-CRITICAL rule:", promptText.includes("SAFETY-CRITICAL"));
    console.log("Prompt requests _corrections key:", promptText.includes('"_corrections"'));
    console.log("Prompt requests _flags key:", promptText.includes('"_flags"'));
    console.log("Prompt tells AI never to silently guess:", promptText.toLowerCase().includes("do not") || promptText.toLowerCase().includes("never guess"));

    // 2. fillFieldsWithAI parses _corrections/_flags and renders the review box
    const fakeLeafPath = win.DATA.leaves[1].path;
    const fakeResponse = {
      content: [{ text: JSON.stringify({
        patientName: "Test Case C",
        procedurePath: fakeLeafPath,
        _corrections: ["heard 'graphic materials ethos', corrected to 'graft materials, EthOss'"],
        _flags: ["sites: heard 'tooth two four or tooth two six, unclear which' - confirm against the recording"],
      }) }]
    };
    win.fetch = async () => ({ ok: true, json: async () => fakeResponse });
    win.state.caseTranscript = "some dictation text";
    await win.fillFieldsWithAI();

    console.log("aiCorrections stored:", win.state.aiCorrections.length === 1);
    console.log("aiFlags stored:", win.state.aiFlags.length === 1);

    const reviewBox = doc.getElementById("aiReviewBox").innerHTML;
    console.log("Review box shows flag warning:", reviewBox.includes("double-check") && reviewBox.includes("tooth two four"));
    console.log("Review box shows corrections detail:", reviewBox.includes("auto-corrected") && reviewBox.includes("EthOss"));

    // 3. Empty corrections/flags renders nothing (no stale leftover clutter)
    win.state.aiCorrections = [];
    win.state.aiFlags = [];
    win.renderAiReviewBox();
    console.log("Review box empty when no corrections/flags:", doc.getElementById("aiReviewBox").innerHTML === "");

    // 4. Copy buttons exist in the review toolbar
    win.goToStep(2);
    win.state.patientName = "Jane Doe";
    win.state.procedurePath = fakeLeafPath;
    win.goToStep(7); // Review is now index 7
    win.buildReview();
    const copyBtns = Array.from(doc.querySelectorAll("button")).filter(b => b.textContent.includes("Copy"));
    console.log("Copy clinician summary button present:", copyBtns.some(b => b.textContent.includes("Copy clinician summary")));
    console.log("Copy materials list button present:", copyBtns.some(b => b.textContent.includes("Copy materials list")));
    console.log("Copy quotation button present:", copyBtns.some(b => b.textContent.includes("Copy quotation")));
    console.log("Copy day surgery button present:", copyBtns.some(b => b.textContent.includes("Copy day surgery")));
    console.log("Copy perioperative button present:", copyBtns.some(b => b.textContent.includes("Copy perioperative")));

    // 5. Plain-text builders produce clean, HTML-free text with the right content
    const reportText = win.textReport();
    console.log("Report text has no HTML tags:", !/<[a-z][\s\S]*>/i.test(reportText));
    console.log("Report text includes patient name:", reportText.includes("Jane Doe"));

    const materialsText = win.textMaterials();
    console.log("Materials text has no HTML tags:", !/<[a-z][\s\S]*>/i.test(materialsText));

    // 6. copyToClipboard uses navigator.clipboard.writeText when available
    let clipboardCapture = "";
    win.navigator.clipboard = { writeText: (t) => { clipboardCapture = t; return Promise.resolve(); } };
    const fakeBtn = doc.createElement("button");
    fakeBtn.textContent = "📋 Copy clinician summary";
    win.copyPanel("report", fakeBtn);
    // clipboard write is async via microtask; flush
    await Promise.resolve();
    console.log("copyPanel('report') wrote clinician report text to clipboard:", clipboardCapture.includes("CLINICIAN REPORT") && clipboardCapture.includes("Jane Doe"));

    console.log("ALL TEST15 (DICTATION ACCURACY + COPY-TO-EHR) CHECKS DONE");
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}, 500);
