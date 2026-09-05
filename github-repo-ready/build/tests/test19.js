const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("/sessions/wizardly-loving-rubin/mnt/outputs/Case_Intake_App.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
const win = dom.window;

// Stub fetch so activateLicense() can be tested without a real Netlify function.
let lastFetchBody = null;
win.fetch = async (url, opts) => {
  lastFetchBody = JSON.parse(opts.body);
  if (lastFetchBody.code === "GOODCODE") {
    return { json: async () => ({ valid: true, tier: 2, addons: { perioperative: true, riskIndicator: false }, email: "test@example.com" }) };
  }
  return { json: async () => ({ valid: false }) };
};

setTimeout(async () => {
  try {
    const doc = win.document;

    // 1. No license at all -> everything past Review is locked, license bar shows plans
    win.clearLicense();
    win.goToStep(0);
    console.log("Tier 0: step 0 (Patient&referral) is locked:", !win.tabAccessAllowed(0));
    console.log("Tier 0: step 7 (Review) is NOT locked:", win.tabAccessAllowed(7));
    const bar0 = doc.getElementById("licenseBar").innerHTML;
    console.log("License bar shows all 3 tier purchase links when tier 0:", bar0.includes("Tier 1") && bar0.includes("Tier 2") && bar0.includes("Tier 3"));
    const step0html = doc.getElementById("stepArea").innerHTML;
    console.log("Step content shows upsell, not the real form, when locked:", step0html.includes("is locked") && !step0html.includes("Reason for referral"));

    // 2. Tier 1 -> tabs 0,1,2 unlocked; 3+ locked
    win.license.tier = 1;
    win.goToStep(0);
    console.log("Tier 1: step 0 unlocked:", win.tabAccessAllowed(0));
    console.log("Tier 1: step 2 unlocked:", win.tabAccessAllowed(2));
    console.log("Tier 1: step 3 (Materials) locked:", !win.tabAccessAllowed(3));
    win.goToStep(0);
    const t1step0 = doc.getElementById("stepArea").innerHTML;
    console.log("Tier 1: real form renders for step 0:", t1step0.includes("Reason for referral"));
    win.goToStep(3);
    const t1step3 = doc.getElementById("stepArea").innerHTML;
    console.log("Tier 1: step 3 shows upsell pointing at Tier 2:", t1step3.includes("is locked") && t1step3.includes("Tier 2"));

    // 3. Tier 2 -> tabs 0-4 unlocked, 5/6 locked unless addon
    win.license.tier = 2;
    console.log("Tier 2: step 4 (Day surgery) unlocked:", win.tabAccessAllowed(4));
    console.log("Tier 2: step 5 (Perioperative) locked without addon:", !win.tabAccessAllowed(5));
    win.license.addons.perioperative = true;
    console.log("Tier 2 + perioperative addon: step 5 unlocked:", win.tabAccessAllowed(5));
    console.log("Tier 2 + perioperative addon: step 6 (Risk indicator) still locked:", !win.tabAccessAllowed(6));

    // 4. Tier 3 -> everything unlocked regardless of addons
    win.license.tier = 3;
    win.license.addons = { perioperative: false, riskIndicator: false };
    console.log("Tier 3: step 5 unlocked with no addon:", win.tabAccessAllowed(5));
    console.log("Tier 3: step 6 unlocked with no addon:", win.tabAccessAllowed(6));

    // 5. Locked stepper dots render a lock icon; unlocked dots don't
    win.license.tier = 1;
    win.goToStep(0);
    const stepperHtml = doc.getElementById("stepper").innerHTML;
    console.log("Stepper shows lock icon on locked step:", /5\. Perioperative[^<]*🔒/.test(stepperHtml));
    console.log("Stepper does NOT show lock icon on unlocked step:", !/1\. Patient & referral[^<]*🔒/.test(stepperHtml));

    // 6. License persists to localStorage and reloads
    win.license.tier = 2;
    win.license.addons = { perioperative: true, riskIndicator: false };
    win.license.code = "PERSIST-TEST";
    win.saveLicense();
    const stored = JSON.parse(win.localStorage.getItem("dir_case_intake_license_v1"));
    console.log("License persists to localStorage:", stored.tier === 2 && stored.code === "PERSIST-TEST" && stored.addons.perioperative === true);

    // 7. clearLicense wipes it back to tier 0 and removes storage
    win.clearLicense();
    console.log("clearLicense resets tier to 0:", win.license.tier === 0);
    console.log("clearLicense removes localStorage entry:", win.localStorage.getItem("dir_case_intake_license_v1") === null);

    // 8. activateLicense() end-to-end against stubbed fetch
    win.goToStep(0); // renders the license bar + entry form since tier is 0
    doc.getElementById("licenseCodeInput").value = "GOODCODE";
    await win.activateLicense();
    console.log("activateLicense() unlocks tier from server response:", win.license.tier === 2);
    console.log("activateLicense() applies addons from server response:", win.license.addons.perioperative === true && win.license.addons.riskIndicator === false);
    console.log("activateLicense() persists after activation:", JSON.parse(win.localStorage.getItem("dir_case_intake_license_v1")).tier === 2);

    // Bad code -> stays locked, shows an error message
    win.clearLicense();
    win.goToStep(0);
    doc.getElementById("licenseCodeInput").value = "BADCODE";
    await win.activateLicense();
    console.log("activateLicense() with bad code leaves tier at 0:", win.license.tier === 0);
    console.log("activateLicense() with bad code shows an error message:", doc.getElementById("licenseStatusMsg").textContent.includes("isn't valid"));

    // Cleanup so later manual testing starts fresh
    win.clearLicense();

    console.log("ALL TEST19 (TIERED ACCESS / LICENSE GATING) CHECKS DONE");
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}, 500);
