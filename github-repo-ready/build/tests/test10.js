const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;
setTimeout(() => {
  // 1. FDI per code
  win.goToStep(2);
  win.state.procedurePath = win.DATA.leaves[2].path; // has codes 393, 688 per earlier test
  win.renderStep();
  const leaf = win.DATA.leaves[2];
  const firstCode = leaf.codes.split(",")[0].trim();
  win.state.codeFdiMap[firstCode] = "16";
  win.state.pendingExtraCode = "981";
  win.state.pendingExtraFdi = "24";
  win.addExtraCode();
  console.log("codeFdiMap base code set:", win.state.codeFdiMap[firstCode] === "16");
  console.log("codeFdiMap extra code set:", win.state.codeFdiMap["981"] === "24");

  // 2. graft notes
  win.goToStep(3);
  win.state.graftNotes = "Placed via lateral window approach";
  console.log("graftNotes stored:", win.state.graftNotes);

  // 4. multi antibiotics
  win.toggleMultiValue("antibioticsIntraop", "Amoxil");
  win.toggleMultiValue("antibioticsIntraop", "Flagyl");
  win.toggleMultiValue("antibioticsPostop", "Keflex");
  console.log("antibioticsIntraop:", win.state.antibioticsIntraop);
  console.log("antibioticsPostop:", win.state.antibioticsPostop);

  // 5. day surg new fields
  win.goToStep(4);
  win.state.dsMedicalConditions = "Type 2 diabetes, well controlled";
  win.state.dsMedications = "Metformin 500mg BD";
  console.log("dsMedicalConditions stored:", win.state.dsMedicalConditions);

  win.goToStep(5);
  win.buildReview();
  const report = win.document.getElementById("panel-report").textContent;
  const materials = win.document.getElementById("panel-materials").textContent;
  const ds = win.document.getElementById("panel-daysurgery").textContent;
  const quote = win.document.getElementById("panel-quote").innerHTML;

  console.log("Report shows FDI 16 for base code:", report.includes("FDI 16"));
  console.log("Report shows FDI 24 for extra code 981:", report.includes("FDI 24"));
  console.log("Materials shows graft notes:", materials.includes("lateral window approach"));
  console.log("Materials shows both antibiotics intraop:", materials.includes("Amoxil, Flagyl"));
  console.log("Materials shows antibiotic postop:", materials.includes("Keflex"));
  console.log("Quote table has FDI column header:", quote.includes("Tooth/site (FDI)"));
  console.log("Quote shows FDI 16 value in row:", quote.includes("<td>16</td>"));
  console.log("DaySurgery shows medical conditions:", ds.includes("Type 2 diabetes"));
  console.log("DaySurgery shows medications:", ds.includes("Metformin 500mg BD"));
  console.log("ALL ROUND-3 FEATURE TESTS OK");
}, 500);
