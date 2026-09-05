const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");

const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;

setTimeout(() => {
  const doc = win.document;

  // Step 0: consult date is a date input with a Today button
  win.goToStep(0);
  const consultInput = doc.getElementById("f_consultDate");
  console.log("consultDate is date input:", consultInput && consultInput.type === "date");
  const todayBtns = Array.from(doc.querySelectorAll("button")).filter(b => b.textContent.trim() === "Today");
  console.log("Today button present:", todayBtns.length > 0);
  todayBtns[0].click();
  const iso = new Date().toISOString().slice(0, 10);
  console.log("Today button set correct date:", win.state.consultDate === iso);

  // Step 2: consent defaults to Yes, procedure list includes new D leaf
  win.goToStep(2);
  console.log("consent defaults to Yes:", win.state.consent === "Yes");
  console.log("dirConsent defaults to Yes:", win.state.dirConsent === "Yes");
  const procOptions = Array.from(doc.querySelectorAll("select option")).map(o => o.value);
  console.log("New D leaf (simple extraction+graft) present:", procOptions.some(p => p.includes("Simple extraction with bone graft")));
  console.log("New D leaf (surgical extraction+graft) present:", procOptions.some(p => p.includes("Surgical extraction with bone graft")));

  // Step 4: duration is a dropdown with fixed options; fasting/escort default Yes
  win.goToStep(4);
  console.log("fasting defaults to Yes:", win.state.fasting === "Yes");
  console.log("escort defaults to Yes:", win.state.escort === "Yes");
  const durationSelect = Array.from(doc.querySelectorAll("select")).find(s =>
    Array.from(s.options).some(o => o.value === "90 min"));
  console.log("Duration dropdown has 90 min option:", !!durationSelect);
  console.log("Duration dropdown has 180 min option:", durationSelect && Array.from(durationSelect.options).some(o => o.value === "180 min"));

  // Vocabulary includes new static clinical terms
  const vocab = win.buildDomainVocabulary ? win.buildDomainVocabulary() : [];
  console.log("Vocab function exposed:", typeof win.buildDomainVocabulary);

  console.log("ALL TEST12 CHECKS DONE");
}, 500);
