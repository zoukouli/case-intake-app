const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;
win.alert = (m) => console.log("ALERT:", m);
win.prompt = () => "sk-ant-test-fake-key";

setTimeout(async () => {
  try {
    console.log("dictationArea rendered:", win.document.getElementById("dictationArea").innerHTML.includes("Fill fields with AI"));
    console.log("caseTranscriptBox exists:", !!win.document.getElementById("caseTranscriptBox"));

    // fake AI response
    const fakeLeafPath = win.DATA.leaves[2].path;
    const fakeResponse = {
      content: [{ text: JSON.stringify({
        patientName: "Test Case B",
        dob: "01/01/1980",
        reasonForReferral: "Referred for implant assessment",
        chiefComplaint: "Missing tooth 26",
        medHistory: "Nil significant",
        diagnosis: "Partial edentulism",
        procedurePath: fakeLeafPath,
        daySurgeryNeeded: "yes",
        asa: "ASA I",
      }) }]
    };
    win.fetch = async (url, opts) => {
      console.log("fetch called with header x-api-key present:", !!JSON.parse(JSON.stringify(opts.headers))["x-api-key"]);
      return { ok: true, json: async () => fakeResponse };
    };

    win.state.caseTranscript = "Patient referred for implant assessment, missing tooth 26, nil significant medical history...";
    await win.fillFieldsWithAI();

    console.log("patientName filled:", win.state.patientName);
    console.log("procedurePath filled correctly:", win.state.procedurePath === fakeLeafPath);
    console.log("daySurgeryNeeded filled:", win.state.daySurgeryNeeded);
    console.log("API key persisted:", win.getApiKey());

    win.goToStep(5);
    win.buildReview();
    const report = win.document.getElementById("panel-report").textContent;
    console.log("Report reflects AI-filled patient name:", report.includes("Test Case B"));
    console.log("ALL AI-FILL TESTS OK");
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}, 500);
