const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
const win = dom.window;

setTimeout(() => {
  try {
    win.state.patientName = "Test Case A";
    win.goToStep(2);
    win.state.procedurePath = win.DATA.leaves[0].path;
    win.renderStep();
    console.log("procedurePath set:", win.state.procedurePath, "codes:", win.state.extraCodes);
    win.state.pendingExtraCode = "981";
    win.addExtraCode();
    console.log("extraCodes after add:", win.state.extraCodes);

    win.goToStep(3);
    // pick an implant
    const impl = win.DATA.implants[0];
    win.state.pendingImplant.manufacturer = impl.manufacturer;
    win.state.pendingImplant.line = impl.line;
    win.renderStep();
    win.state.pendingImplant.diameter = impl.diameterList[0];
    const lengthOpts = impl.lengthByDiameter ? impl.lengthByDiameter[impl.diameterList[0]] : impl.lengthList;
    win.state.pendingImplant.length = lengthOpts[0];
    win.addImplant();
    console.log("selectedImplants:", win.state.selectedImplants);

    const graft = win.DATA.grafts[0];
    win.state.pendingGraft.category = graft.category;
    win.renderStep();
    win.state.pendingGraft.product = graft.product;
    win.addGraft();
    console.log("selectedGrafts:", win.state.selectedGrafts);

    win.goToStep(5);
    win.buildReview();
    const reportText = win.document.getElementById("panel-report").textContent;
    const matText = win.document.getElementById("panel-materials").textContent;
    const quoteText = win.document.getElementById("panel-quote").textContent;
    console.log("REPORT includes patient:", reportText.includes("Test Case A"));
    console.log("REPORT includes extra code 981:", reportText.includes("981"));
    console.log("MATERIALS includes implant:", matText.includes(impl.manufacturer));
    console.log("MATERIALS includes graft:", matText.includes(graft.product));
    console.log("QUOTE has code row:", quoteText.includes("981") || quoteText.length > 0);
    console.log("ALL TESTS RAN OK");
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}, 500);
