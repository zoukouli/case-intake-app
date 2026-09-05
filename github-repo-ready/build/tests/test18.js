const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;

setTimeout(() => {
  try {
    const doc = win.document;
    win.goToStep(6);

    const pillGroups = doc.querySelectorAll(".pill-group");
    console.log("9 pill groups rendered (one per risk factor):", pillGroups.length === 9);

    const anySelectForRiskFactors = Array.from(doc.querySelectorAll("#stepArea select")).some(s =>
      Array.from(s.options).some(o => o.value === "current" || o.value === "poorly_controlled"));
    console.log("No <select> dropdowns used for risk factors:", !anySelectForRiskFactors);

    const smokingButtons = Array.from(pillGroups[0].querySelectorAll("button"));
    console.log("Smoking pill labels:", smokingButtons.map(b => b.textContent.trim()));
    console.log("None selected initially:", !smokingButtons.some(b => b.className.includes("selected")));

    smokingButtons[2].click(); // "Current"
    console.log("state.riskSmoking set by click:", win.state.riskSmoking === "current");
    const reSelected = Array.from(doc.querySelectorAll(".pill-group")[0].querySelectorAll("button"));
    console.log("Clicked pill shows selected class after re-render:", reSelected[2].className.includes("selected"));
    console.log("Other pills in the group are not selected:", !reSelected[0].className.includes("selected") && !reSelected[1].className.includes("selected"));

    // Click again to deselect
    reSelected[2].click();
    console.log("Clicking selected pill again clears it:", win.state.riskSmoking === "");

    console.log("ALL TEST18 (RISK INDICATOR PILL BUTTONS) CHECKS DONE");
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}, 500);
