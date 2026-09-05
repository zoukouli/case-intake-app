const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;
setTimeout(() => {
  win.goToStep(3);
  // check no ranges remain anywhere in implants dataset
  const allDiam = win.DATA.implants.flatMap(i => i.diameterList);
  const rangesLeft = allDiam.filter(d => /[-–]/.test(d));
  console.log("Any diameter ranges left:", rangesLeft);

  win.state.pendingImplant.manufacturer = "Straumann";
  win.state.pendingImplant.line = "BLC (Bone Level, cylindrical)";
  win.renderStep();
  console.log("BLC diameters:", win.currentImplantRow ? "n/a" : "");
  const diamHtml = win.implantDiameterSelect();
  console.log("BLC diameter options include 5.5:", diamHtml.includes(">5.5<"));

  win.state.pendingImplant.diameter = "5.5";
  const lenHtml55 = win.implantLengthSelect();
  console.log("BLC 5.5mm length options (should stop at 16, no 18):", lenHtml55.includes(">18<") ? "FAIL has 18" : "OK no 18", lenHtml55.includes(">16<") ? "has16" : "missing16");

  win.state.pendingImplant.diameter = "4.0";
  const lenHtml40 = win.implantLengthSelect();
  console.log("BLC 4.0mm length options include 18:", lenHtml40.includes(">18<"));

  // Southern INVERTA
  win.state.pendingImplant.manufacturer = "Southern Implants";
  win.state.pendingImplant.line = "External Hex INVERTA (Regular)";
  win.renderStep();
  const invDiam = win.implantDiameterSelect();
  console.log("INVERTA Regular diameters no longer a range:", !invDiam.includes("3.0") && invDiam.includes(">4.0<") && invDiam.includes(">5.0<"));

  console.log("ALL IMPLANT-SIZE TESTS OK");
}, 500);
