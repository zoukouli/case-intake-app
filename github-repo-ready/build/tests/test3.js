const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
const win = dom.window;
win.alert = (msg) => { console.log("ALERT:", msg); };
setTimeout(() => {
  win.goToStep(1);
  console.log("supportsSpeech (should be false in jsdom):", win.supportsSpeech());
  console.log("mic button exists:", !!win.document.getElementById("mic_chiefComplaint"));
  win.startFieldDictation("chiefComplaint"); // should alert, not throw
  win.startGuidedDictation(); // should alert per field attempt, not throw
  console.log("guided banner present:", !!win.document.getElementById("guidedBanner"));
  console.log("NO CRASH - OK");
}, 500);
