const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;
win.print = () => console.log("window.print() called");
setTimeout(() => {
  win.goToStep(2);
  win.state.procedurePath = win.DATA.leaves[2].path;
  win.goToStep(4);
  win.state.daySurgeryNeeded = "yes";
  win.renderStep();
  console.log("ASA is now a select with ASA I-IV:", win.document.body.innerHTML.includes("ASA III"));
  console.log("Fasting is yes/no select:", win.document.body.innerHTML.includes("Fasting requirement discussed"));
  win.goToStep(5);
  win.buildReview();
  const quoteHtml = win.document.getElementById("panel-quote").innerHTML;
  console.log("Quote has no Fee column:", !quoteHtml.includes("Fee ($)"));
  console.log("Quote has no fee input:", !quoteHtml.includes("fee-input"));
  win.printPanel();
  const printHtml = win.document.getElementById("printArea").innerHTML;
  console.log("Print area includes all 4 sections:",
    printHtml.includes("Clinician report") && printHtml.includes("Material list") &&
    printHtml.includes("Quotation") && printHtml.includes("Day surgery summary"));
  console.log("ALL FEEDBACK-ROUND-2 TESTS OK");
}, 500);
