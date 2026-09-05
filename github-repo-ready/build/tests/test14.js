const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");

const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;

setTimeout(() => {
  const doc = win.document;

  // STEPS array now has 8 entries: ... Day surgery, Perioperative, Risk indicator, Review
  console.log("Stepper has 8 steps:", doc.querySelectorAll(".step-dot").length === 8);
  const stepLabels = Array.from(doc.querySelectorAll(".step-dot")).map(d => d.textContent.trim());
  const perioIdx = stepLabels.findIndex(s => s.includes("Perioperative"));
  const riskIdx = stepLabels.findIndex(s => s.includes("Risk indicator"));
  const reviewIdx = stepLabels.findIndex(s => s.includes("Review"));
  console.log("Perioperative step present:", perioIdx !== -1);
  console.log("Perioperative immediately before Risk indicator:", perioIdx === riskIdx - 1);
  console.log("Risk indicator immediately before Review:", riskIdx === reviewIdx - 1);

  // Go to Perioperative step (index 5)
  win.goToStep(5);
  const disclaimer = doc.querySelector(".med-disclaimer");
  console.log("Disclaimer banner present on step 5:", !!disclaimer && disclaimer.textContent.includes("UNVERIFIED"));

  const bleedSelect = Array.from(doc.querySelectorAll("select")).find(s =>
    Array.from(s.options).some(o => o.value === "low_bleed_risk"));
  console.log("Bleed-risk selector present:", !!bleedSelect);

  // Matched medication: warfarin -> vitamin_k_antagonist class, has procedure_variants
  win.state.pendingMedQuery = "warfarin";
  win.addMedication();
  console.log("Medication added (matched):", win.state.perioperativeMeds.length === 1 && win.state.perioperativeMeds[0].matched === true);
  console.log("pendingMedQuery cleared after add:", win.state.pendingMedQuery === "");

  const match = win.matchMedication("clexane");
  console.log("Brand-name fuzzy match (clexane) resolves to a class:", !!match && match.classIds.length > 0);

  // Unmatched / unrecognised drug
  win.state.pendingMedQuery = "totallymadeupdrugxyz";
  win.addMedication();
  const unmatched = win.state.perioperativeMeds[1];
  console.log("Unmatched medication flagged (not silently dropped):", unmatched.matched === false && unmatched.query === "totallymadeupdrugxyz");

  // Badge computation
  const badge0 = win.medStatusBadge(win.state.perioperativeMeds[0]);
  console.log("Matched medication has a real status badge:", ["continue", "hold", "stop", "unknown"].includes(badge0.label));
  const badge1 = win.medStatusBadge(win.state.perioperativeMeds[1]);
  console.log("Unmatched medication badge is 'not found':", badge1.label === "not found");

  // Bleed-risk variant switching changes guidance for a class that has procedure_variants
  const classesWithVariants = Object.values(win.MED_DATA.classes).filter(c => c.procedure_variants);
  console.log("At least one class has dental procedure_variants:", classesWithVariants.length > 0);
  if (classesWithVariants.length) {
    const cid = classesWithVariants[0].id;
    win.state.perioperativeBleedRisk = "";
    const baseAction = win.medActionFor(cid);
    win.state.perioperativeBleedRisk = "low_bleed_risk";
    const lowAction = win.medActionFor(cid);
    console.log("Bleed-risk selection changes guidance for a dental-variant class:", JSON.stringify(baseAction) !== JSON.stringify(lowAction) || classesWithVariants[0].procedure_variants.low_bleed_risk === undefined);
  }
  win.state.perioperativeBleedRisk = "";

  // Rendering after re-render still shows both entries with badges
  win.renderStep();
  const medCards = doc.querySelectorAll("#stepArea .med-card");
  console.log("Rendered med cards for both entries:", medCards.length >= 2);
  console.log("Rendered list shows not-found message for unmatched drug:", doc.getElementById("stepArea").innerHTML.includes("Not found in ruleset"));

  // Remove a medication
  win.removeMedication(1);
  console.log("Medication removed:", win.state.perioperativeMeds.length === 1);

  // Next/back button wiring across 8 steps
  win.goToStep(5);
  const nextBtnOnPerio = Array.from(doc.querySelectorAll("button")).find(b => b.textContent.includes("Review & generate") || b.textContent.trim() === "Next");
  console.log("Button says 'Next' (not last step) on Perioperative step 5:", nextBtnOnPerio.textContent.trim() === "Next");
  win.goToStep(6);
  const nextBtnOnRisk = Array.from(doc.querySelectorAll("button")).find(b => b.textContent.includes("Review & generate") || b.textContent.trim() === "Next");
  console.log("Button says 'Review & generate' on Risk indicator step 6 (last before Review):", nextBtnOnRisk.textContent.trim() === "Review & generate");
  win.nextStep();
  const reviewVisible = doc.getElementById("reviewArea").style.display === "block";
  console.log("Review area visible after advancing from step 6:", reviewVisible);

  // Review/print panel includes perioperative content
  win.buildReview();
  const perioPanel = doc.getElementById("panel-perioperative").innerHTML;
  console.log("Review panel includes perioperative medications heading:", perioPanel.includes("Perioperative medications"));
  console.log("Review panel includes disclaimer:", perioPanel.includes("UNVERIFIED"));
  console.log("Review panel includes warfarin entry:", perioPanel.includes("warfarin"));

  win.printPanel();
  const printArea = doc.getElementById("printArea").innerHTML;
  console.log("Print output includes perioperative panel content:", printArea.includes("Perioperative medications"));

  console.log("ALL TEST14 (PERIOPERATIVE TAB) CHECKS DONE");
}, 500);
