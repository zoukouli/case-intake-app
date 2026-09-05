const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;

setTimeout(() => {
  const lines = win.DATA.implants.filter(i => i.manufacturer === "Southern Implants").map(i => i.line);
  console.log("Southern Implants lines:", lines);

  const expected = [
    "Single Platform (SP1)",
    "Single Platform (SP1) — Pterygoid",
    "Internal Hex Tapered",
    "PROVATA (Straight)",
    "PROVATA (Co-Axis, 12°)",
    "Deep Conical PTERYGOID",
    "External Hex INVERTA (Regular)",
    "External Hex INVERTA (Co-Axis, 12°)",
    "External Hex (Straight)",
    "External Hex (Co-Axis, 12°)",
    "External Hex (Co-Axis, 24°)",
    "External Hex (Co-Axis, 36°)",
    "PROMAX",
  ];
  const missing = expected.filter(e => !lines.includes(e));
  console.log("Missing expected lines:", missing);

  function row(line) { return win.DATA.implants.find(i => i.manufacturer === "Southern Implants" && i.line === line); }

  // SP1 has 6 diameters, Ø4.0 goes up to 24mm
  const sp1 = row("Single Platform (SP1)");
  console.log("SP1 diameters:", sp1.diameterList);
  console.log("SP1 Ø4.0 lengths include 24:", sp1.lengthByDiameter["4.0"].includes("24"));
  console.log("SP1 Ø5.0 lengths stop at 18 (no 20/22/24):", !sp1.lengthByDiameter["5.0"].includes("20"));

  // External Hex Co-Axis 36 only exists for 4.0/5.0
  const ex36 = row("External Hex (Co-Axis, 36°)");
  console.log("Ex Hex 36° diameters (only 4.0/5.0):", ex36.diameterList);

  // External Hex Co-Axis 12 exists for 3.25 too
  const ex12 = row("External Hex (Co-Axis, 12°)");
  console.log("Ex Hex 12° includes 3.25:", ex12.diameterList.includes("3.25"));

  // PROVATA Co-Axis only 3.3/4.0/5.0 (no 6.0)
  const prov12 = row("PROVATA (Co-Axis, 12°)");
  console.log("PROVATA Co-Axis diameters (no 6.0):", prov12.diameterList, "has 6.0:", prov12.diameterList.includes("6.0"));

  // PROMAX all 4 diameters, lengths 7/9/11
  const promax = row("PROMAX");
  console.log("PROMAX diameters:", promax.diameterList);
  console.log("PROMAX Ø9.0 lengths:", promax.lengthByDiameter["9.0"]);

  // Drive through the UI: pick Southern Implants > External Hex (Co-Axis, 24°) > 4.0 > 24
  win.goToStep(3);
  win.state.pendingImplant.manufacturer = "Southern Implants";
  win.state.pendingImplant.line = "External Hex (Co-Axis, 24°)";
  win.renderStep();
  win.state.pendingImplant.diameter = "4.0";
  win.renderStep();
  const doc = win.document;
  const lengthSelect = Array.from(doc.querySelectorAll("select")).find(s => s.previousElementSibling && s.previousElementSibling.textContent === "Length (mm)");
  const lenOptions = lengthSelect ? Array.from(lengthSelect.options).map(o => o.value) : [];
  console.log("UI-driven Ex Hex 24° Ø4.0 length options include 24:", lenOptions.includes("24"));
  win.state.pendingImplant.length = "24";
  win.addImplant();
  console.log("Added implant label:", win.state.selectedImplants[win.state.selectedImplants.length - 1]);

  console.log("ALL TEST13 (NEW IMPLANT CATALOGUE) CHECKS DONE");
}, 500);
