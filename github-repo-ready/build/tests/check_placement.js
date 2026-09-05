const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;
setTimeout(() => {
  const doc = win.document;
  win.goToStep(6);
  win.buildReview();
  const copyInMaterials = doc.getElementById("panel-materials").innerHTML.includes("Copy materials list");
  const copyInReport = doc.getElementById("panel-report").innerHTML.includes("Copy clinician summary");
  const staticToolbarHasCopy = Array.from(doc.querySelectorAll(".out-tabs ~ .toolbar button")).some(b => b.textContent.includes("Copy"));
  console.log("Copy materials button lives inside panel-materials:", copyInMaterials);
  console.log("Copy report button lives inside panel-report:", copyInReport);
  console.log("Bottom toolbar (Print/Export/Start new) has no leftover Copy buttons:", !staticToolbarHasCopy);
}, 500);
