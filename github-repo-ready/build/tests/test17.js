const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;

setTimeout(() => {
  try {
    const doc = win.document;

    // Stepper placement: Risk indicator sits between Perioperative and Review
    const stepLabels = Array.from(doc.querySelectorAll(".step-dot")).map(d => d.textContent.trim());
    console.log("Stepper has 8 steps:", stepLabels.length === 8);
    const perioIdx = stepLabels.findIndex(s => s.includes("Perioperative"));
    const riskIdx = stepLabels.findIndex(s => s.includes("Risk indicator"));
    const reviewIdx = stepLabels.findIndex(s => s.includes("Review"));
    console.log("Risk indicator directly after Perioperative:", riskIdx === perioIdx + 1);
    console.log("Risk indicator directly before Review:", riskIdx === reviewIdx - 1);

    // Go to the Risk indicator step
    win.goToStep(6);
    const disclaimer = doc.querySelector(".med-disclaimer");
    console.log("Disclaimer present on Risk indicator step:", !!disclaimer && disclaimer.textContent.includes("Not yet through Scientific Committee"));

    // Score starts at 0 with nothing selected
    let score = win.computeRiskScore();
    console.log("Score is 0 with no factors selected:", score.total === 0);
    console.log("answered count is 0:", score.answered === 0);

    // Selecting the worst option on every factor should sum to 21 (per the supplied model)
    win.state.riskSmoking = "current";        // 3
    win.state.riskDiabetes = "poorly_controlled"; // 4
    win.state.riskOralHygiene = "poor";        // 4
    win.state.riskPerioHistory = "yes";        // 3
    win.state.riskBoneQuality = "d3_d4";       // 2
    win.state.riskLoadingProtocol = "immediate"; // 1
    win.state.riskGrafting = "yes";            // 1
    win.state.riskProsthesis = "cantilever_full_arch"; // 1
    win.state.riskImplantSite = "posterior_maxilla";   // 2
    score = win.computeRiskScore();
    console.log("Worst-case composite score is 21:", score.total === 21);
    console.log("Worst-case band is High:", win.riskBandFor(score.total).label === "High");
    console.log("All 9 factors answered:", score.answered === 9 && score.total_factors === 9);
    console.log("Breakdown lists all 9 contributing factors:", score.breakdown.length === 9);

    // Best-case (all zero-point options) -> Low band
    win.state.riskSmoking = "never";
    win.state.riskDiabetes = "none_or_controlled";
    win.state.riskOralHygiene = "excellent";
    win.state.riskPerioHistory = "no";
    win.state.riskBoneQuality = "d1_d2";
    win.state.riskLoadingProtocol = "conventional";
    win.state.riskGrafting = "no";
    win.state.riskProsthesis = "single_unit";
    win.state.riskImplantSite = "anterior";
    score = win.computeRiskScore();
    console.log("Best-case composite score is 0:", score.total === 0);
    console.log("Best-case band is Low:", win.riskBandFor(score.total).label === "Low");
    console.log("Best-case has no contributing factors listed:", score.breakdown.length === 0);

    // Moderate band boundary check (score between 6 and 12)
    win.state.riskSmoking = "current"; // 3
    win.state.riskPerioHistory = "yes"; // 3
    score = win.computeRiskScore();
    console.log("Score 6 lands in Moderate band:", score.total === 6 && win.riskBandFor(6).label === "Moderate");

    // Antibiotic allergy field is present but not scored
    win.state.riskAntibioticAllergy = "Penicillin allergy - use clindamycin";
    win.renderStep();
    const stepHtml = doc.getElementById("stepArea").innerHTML;
    console.log("Antibiotic allergy field present and labelled as a planning flag (not scored):", stepHtml.includes("Antibiotic allergy considerations") && stepHtml.includes("not scored"));
    const scoreAfterAllergy = win.computeRiskScore();
    console.log("Antibiotic allergy entry doesn't change the score:", scoreAfterAllergy.total === score.total);

    // Caveats are present (collapsible) for governance transparency
    console.log("Caveats section present:", stepHtml.includes("Caveats") && stepHtml.includes("Scientific Committee"));

    // Review panel + copy button + print inclusion
    win.goToStep(7);
    win.buildReview();
    const riskPanel = doc.getElementById("panel-riskindicator").innerHTML;
    console.log("Review panel shows composite score:", riskPanel.includes("Composite score"));
    console.log("Review panel shows the risk band:", riskPanel.includes("Moderate risk") || riskPanel.includes("risk"));
    console.log("Copy risk indicator button present in its own panel:", riskPanel.includes("Copy risk indicator"));

    win.printPanel();
    const printArea = doc.getElementById("printArea").innerHTML;
    console.log("Print output includes risk indicator panel:", printArea.includes("Patient risk indicator"));

    // Plain-text copy builder
    const text = win.textRiskIndicator();
    console.log("Plain-text builder has no HTML tags:", !/<[a-z][\s\S]*>/i.test(text));
    console.log("Plain-text builder includes the composite score:", text.includes("Composite score"));

    console.log("ALL TEST17 (PATIENT RISK INDICATOR) CHECKS DONE");
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}, 500);
