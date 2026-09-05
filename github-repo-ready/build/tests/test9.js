const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;
setTimeout(() => {
  win.goToStep(4);
  console.log("--- daySurgeryNeeded = no (default), fields should be visible now ---");
  const htmlNo = win.document.getElementById("stepArea").innerHTML;
  console.log("ASA field present:", htmlNo.includes("ASA classification"));
  console.log("Medication instructions present:", htmlNo.includes("Medication instructions"));
  console.log("Allergies present:", htmlNo.includes("Allergies"));

  win.state.dsMedicationInstructions = "Metformin continued as normal";
  win.state.daySurgeryNeeded = "no"; // explicitly no consult needed
  win.goToStep(5);
  win.buildReview();
  const ds = win.document.getElementById("panel-daysurgery").textContent;
  console.log("Review shows medication info even when consult not required:", ds.includes("Metformin continued as normal"));
  console.log("DONE");
}, 500);
