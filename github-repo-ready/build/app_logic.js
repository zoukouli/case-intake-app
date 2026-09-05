const STEPS = [
  "Patient & referral",
  "History & findings",
  "Procedure & risks",
  "Materials",
  "Day surgery",
  "Perioperative",
  "Risk indicator",
  "Review"
];

// ---- DIR Patient Risk Estimator v0.1 (literature-informed placeholder weights) ----
// Source: user-supplied "DIR Patient Risk Estimator — Literature Basis for Weights (v0.1)".
// Pooled ORs from published systematic reviews/meta-analyses, converted to a
// Framingham-style points scale (log(OR) normalised to the smallest non-zero value).
// NOT DIR-fitted coefficients. Not yet through Scientific Committee / Ethics review.
const RISK_MODEL = {
  version: "0.1",
  status: "Literature-informed placeholder weights, intended as an interim step before recalibration on matured Dental Implant Registry (DIR) outcome data. Not yet through Scientific Committee / Ethics review.",
  scoreMax: 21,
  bands: [
    { max: 5, label: "Low", pct: "≈2–4%", note: "roughly the published baseline implant failure rate (Moraschini 2015 meta-analysis: ~97.2% survival at mean ~13 years)" },
    { max: 12, label: "Moderate", pct: "≈5–10%", note: "" },
    { max: Infinity, label: "High", pct: "≈12–20%+", note: "" },
  ],
  factors: [
    { key: "riskSmoking", label: "Smoking status",
      options: [
        { value: "never", label: "Never smoked", points: 0 },
        { value: "former", label: "Former smoker", points: 1 },
        { value: "current", label: "Current smoker", points: 3 },
      ],
      source: "Naseri et al., meta-analysis, Medicina 2022 — current vs never OR ≈2.4; former-smoker points are a directional estimate." },
    { key: "riskDiabetes", label: "Diabetes control",
      options: [
        { value: "none_or_controlled", label: "None / well-controlled", points: 0 },
        { value: "poorly_controlled", label: "Poorly controlled", points: 4 },
      ],
      source: "Naujokat 2016; de Molon 2019; Nature EBD summary — poorly controlled vs none/controlled OR ≈2.0–3.6 (mid ≈2.75 used)." },
    { key: "riskOralHygiene", label: "Oral hygiene / plaque control",
      options: [
        { value: "excellent", label: "Excellent", points: 0 },
        { value: "good", label: "Good", points: 1 },
        { value: "average", label: "Average", points: 2 },
        { value: "poor", label: "Poor", points: 4 },
      ],
      source: "General periodontal/peri-implant plaque-control literature — poor vs excellent OR ≈3, conservative mid-estimate." },
    { key: "riskPerioHistory", label: "Periodontitis history",
      options: [
        { value: "no", label: "Periodontally healthy", points: 0 },
        { value: "yes", label: "History of periodontitis", points: 3 },
      ],
      source: "Serroni et al. 2024 systematic review/meta-analysis/TSA, Clin Implant Dent Relat Res — OR ≈2.5 (peri-implantitis incidence)." },
    { key: "riskBoneQuality", label: "Bone quality",
      options: [
        { value: "d1_d2", label: "D1–D2 (dense)", points: 0 },
        { value: "d3_d4", label: "D3–D4 (low density)", points: 2 },
      ],
      source: "Multiple low-bone-density prognosis reviews — OR ≈1.7, evidence mixed/heterogeneous." },
    { key: "riskLoadingProtocol", label: "Loading protocol",
      options: [
        { value: "conventional", label: "Conventional / delayed", points: 0 },
        { value: "immediate", label: "Immediate loading", points: 1 },
      ],
      source: "RCT meta-analyses, J Prosthet Dent 2019 — OR ≈1.4 in unselected/mixed case conditions; well-selected cases can be non-inferior." },
    { key: "riskGrafting", label: "Bone grafting / GBR required",
      options: [
        { value: "no", label: "No", points: 0 },
        { value: "yes", label: "Yes", points: 1 },
      ],
      source: "General augmented-site literature — estimated OR ≈1.4, added healing-related risk." },
    { key: "riskProsthesis", label: "Prosthesis complexity",
      options: [
        { value: "single_unit", label: "Single unit", points: 0 },
        { value: "cantilever_full_arch", label: "Cantilever / full-arch", points: 1 },
      ],
      source: "Cantilever FPD systematic reviews — OR ≈1.3, implant-level effect modest." },
    { key: "riskImplantSite", label: "Implant site",
      options: [
        { value: "anterior", label: "Anterior", points: 0 },
        { value: "posterior_mandible", label: "Posterior mandible", points: 0 },
        { value: "posterior_maxilla", label: "Posterior maxilla", points: 2 },
      ],
      source: "Bone-quality-by-site literature — posterior maxilla vs anterior OR ≈1.8 (lower bone density + higher historical failure)." },
  ],
  caveats: [
    "These are not DIR-fitted coefficients. They combine ORs from different populations, implant systems, and follow-up periods, and several used mid-range or estimated values where the literature reported ranges rather than one pooled figure.",
    "Several sources could not be fully verified against primary text during this pass; figures were cross-checked against multiple independent search results but should be spot-checked against the primary PDFs before this is used to inform patient decisions or fees are charged.",
    "As soon as DIR has enough matured complication cases, re-fit with Cox/logistic regression on your own data and swap in those coefficients using the same normalisation method — this keeps the tool's structure stable while its numbers become genuinely yours.",
    "ISQ/insertion torque are deliberately excluded to avoid data leakage (these values only exist after placement, not pre-operatively at the decision point this tool serves).",
    "Route final wording, risk-band percentages, and fee structure through Scientific Committee / Ethics review before this is offered to patients for payment — a monetised, unvalidated risk score carries more scrutiny than a free chairside prototype.",
  ],
};

const ANTIBIOTIC_OPTIONS = ["None", "Amoxil", "Flagyl", "Azithromycin", "Erythromycin", "Keflex", "Doxycycline"];
const LA_OPTIONS = ["Lignocaine", "Marcaine", "Naropin", "Other"];
const SUTURE_OPTIONS = ["5/0", "6/0", "Other"];
const DURATION_OPTIONS = ["60 min", "75 min", "90 min", "105 min", "120 min", "150 min", "180 min"];
const COVER_SCREW_OPTIONS = ["Cover screw", "Healing cap"];
const PRF_COUNT_OPTIONS = ["2", "4", "6"];
const ANAESTHESIA_REQUIRED_OPTIONS = ["LA", "IV", "GA"];

const state = {
  patientName: "", dob: "", consultDate: "", reasonForReferral: "",
  chiefComplaint: "", medHistory: "", extraOral: "", intraOral: "", sites: "",
  imaging: "", diagnosis: "", prognosis: "", treatmentPlanNotes: "",
  procedurePath: "", codeFdiMap: {}, extraCodes: [], riskDiscussion: "", optionsDiscussed: "", consent: "Yes", consentDate: "", dirConsent: "Yes",
  selectedImplants: [], selectedGrafts: [], graftNotes: "", materialNotes: "",
  selectedAnaesthetics: [], anaesthesiaType: "", coverScrewType: "", coverScrewNotes: "",
  membranePins: false, prfRedCount: "", prfGreenCount: "",
  suture: false, sutureGauge: "", sutureNotes: "", surgicalStent: false,
  imagingType: "", antibioticsIntraop: [], antibioticsPostop: [],
  daySurgeryNeeded: "no", asa: "", anaesthesia: "IV", duration: "",
  fasting: "Yes", escort: "Yes", dsMedicalConditions: "", dsMedications: "", dsMedicationInstructions: "", dsAllergies: "",
  pendingImplant: { manufacturer: "", line: "", diameter: "", length: "" },
  pendingGraft: { brand: "", category: "", product: "" },
  pendingExtraCode: "", pendingExtraFdi: "",
  pendingAnaesthetic: "",
  caseTranscript: "",
  perioperativeMeds: [], pendingMedQuery: "", perioperativeBleedRisk: "",
  aiCorrections: [], aiFlags: [], aiFlagsAcknowledged: {},
  riskSmoking: "", riskDiabetes: "", riskOralHygiene: "", riskPerioHistory: "",
  riskBoneQuality: "", riskLoadingProtocol: "", riskGrafting: "", riskProsthesis: "",
  riskImplantSite: "", riskAntibioticAllergy: ""
};

const INITIAL_STATE_JSON = JSON.stringify(state);
function resetState() {
  const fresh = JSON.parse(INITIAL_STATE_JSON);
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, fresh);
}

const AI_FILLABLE_FIELDS = [
  ["patientName", "text", "Patient / case reference (de-identified)"],
  ["dob", "text", "Date of birth"],
  ["consultDate", "text", "Date of consultation"],
  ["reasonForReferral", "text", "Reason for referral"],
  ["chiefComplaint", "text", "Chief complaint / reason for visit"],
  ["medHistory", "text", "Relevant medical history"],
  ["extraOral", "text", "Extra-oral examination"],
  ["intraOral", "text", "Intra-oral / periodontal examination"],
  ["sites", "text", "Site-specific findings (FDI tooth numbers)"],
  ["imaging", "text", "Imaging reviewed & findings"],
  ["diagnosis", "text", "Diagnosis"],
  ["prognosis", "text", "Prognosis"],
  ["treatmentPlanNotes", "text", "Treatment plan (narrative)"],
  ["procedurePath", "enum:leaves", "Procedure (must exactly match one option given, else leave blank)"],
  ["optionsDiscussed", "text", "Treatment options discussed"],
  ["riskDiscussion", "text", "Risks discussed"],
  ["consent", "enum:yesno_cap", "Consent obtained"],
  ["consentDate", "text", "Date consent was obtained (YYYY-MM-DD if mentioned)"],
  ["graftNotes", "text", "Bone graft / biomaterial comments"],
  ["materialNotes", "text", "Sizes, quantities or other material notes"],
  ["daySurgeryNeeded", "enum:yesno", "Does this case need a pre-anaesthetic consultation? yes or no"],
  ["asa", "enum:asa", "ASA classification"],
  ["anaesthesia", "enum:anaesthesia", "Anaesthesia requested"],
  ["duration", "enum:duration", "Estimated duration"],
  ["fasting", "enum:yesno_cap", "Fasting requirement discussed"],
  ["escort", "enum:yesno_cap", "Escort & aftercare arranged"],
  ["dsMedicalConditions", "text", "Relevant medical conditions (for anaesthetic colleague)"],
  ["dsMedications", "text", "Current medications (for anaesthetic colleague)"],
  ["dsMedicationInstructions", "text", "Medication instructions"],
  ["dsAllergies", "text", "Allergies"],
];

let currentStep = 0;

function renderStepper() {
  const el = document.getElementById("stepper");
  el.innerHTML = STEPS.map((s, i) => {
    let cls = "step-dot";
    if (i === currentStep) cls += " active";
    else if (i < currentStep) cls += " done";
    return `<div class="${cls}" onclick="goToStep(${i})">${i + 1}. ${s}</div>`;
  }).join("");
}

function esc(v) { return (v || "").toString().replace(/"/g, "&quot;"); }

function field(label, key, opts) {
  opts = opts || {};
  const val = state[key] || "";
  const hint = opts.hint ? `<span class="opt"> &mdash; ${opts.hint}</span>` : "";
  if (opts.textarea) {
    return `<label>${label}${hint}</label><textarea id="f_${key}" oninput="state.${key}=this.value">${val}</textarea>`;
  }
  return `<label>${label}${hint}</label><input type="text" id="f_${key}" value="${esc(val)}" oninput="state.${key}=this.value" />`;
}

function dateField(label, key, hint) {
  const val = state[key] || "";
  const h = hint ? `<span class="opt"> &mdash; ${hint}</span>` : "";
  return `<label>${label}${h}</label>
    <div class="row" style="gap:8px; align-items:center;">
      <div style="flex:1;"><input type="date" id="f_${key}" value="${esc(val)}" oninput="state.${key}=this.value" /></div>
      <div style="flex:0 0 auto;"><button type="button" class="secondary" onclick="setToday('${key}')">Today</button></div>
    </div>`;
}
function setToday(key) {
  const iso = new Date().toISOString().slice(0, 10);
  state[key] = iso;
  renderStep();
}

function yesNoField(label, key, hint) {
  const val = state[key] || "";
  const h = hint ? `<span class="opt"> &mdash; ${hint}</span>` : "";
  return `<label>${label}${h}</label>
    <select onchange="state.${key}=this.value">
      <option value="" ${val === "" ? "selected" : ""}>-- select --</option>
      <option value="Yes" ${val === "Yes" ? "selected" : ""}>Yes</option>
      <option value="No" ${val === "No" ? "selected" : ""}>No</option>
    </select>`;
}

function toggleMultiValue(key, value) {
  const arr = state[key];
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value); else arr.splice(idx, 1);
}

function multiCheckboxGroup(label, key, options, hint) {
  const selected = state[key] || [];
  const h = hint ? `<span class="opt"> &mdash; ${hint}</span>` : "";
  return `<label>${label}${h}</label>
    <div class="checklist">
      ${options.map(o => `<label><input type="checkbox" ${selected.includes(o) ? "checked" : ""} onchange="toggleMultiValue('${key}', '${o}')" /> ${o}</label>`).join("")}
    </div>`;
}

function selectField(label, key, options, hint) {
  const val = state[key] || "";
  const h = hint ? `<span class="opt"> &mdash; ${hint}</span>` : "";
  return `<label>${label}${h}</label>
    <select onchange="state.${key}=this.value">
      <option value="" ${val === "" ? "selected" : ""}>-- select --</option>
      ${options.map(o => `<option value="${esc(o)}" ${val === o ? "selected" : ""}>${o}</option>`).join("")}
    </select>`;
}

function setRiskFactor(key, value) {
  state[key] = state[key] === value ? "" : value; // click again to deselect/clear
  renderStep();
}

function riskFactorField(f) {
  const val = state[f.key] || "";
  return `<label>${esc(f.label)}</label>
    <div class="pill-group">
      ${f.options.map(o => `<button type="button" class="pill-btn ${val === o.value ? "selected" : ""}" onclick="setRiskFactor('${f.key}', '${o.value}')">${esc(o.label)} <span class="pill-pts">+${o.points}</span></button>`).join("")}
    </div>
    <p class="hint" style="margin:2px 0 0;">${esc(f.source)}</p>`;
}

function computeRiskScore() {
  let total = 0;
  const breakdown = [];
  let answered = 0;
  RISK_MODEL.factors.forEach(f => {
    const val = state[f.key];
    if (!val) return;
    answered++;
    const opt = f.options.find(o => o.value === val);
    if (!opt) return;
    total += opt.points;
    if (opt.points > 0) breakdown.push(`${f.label}: ${opt.label} (+${opt.points})`);
  });
  return { total, breakdown, answered, total_factors: RISK_MODEL.factors.length };
}

function riskBandFor(score) {
  return RISK_MODEL.bands.find(b => score <= b.max) || RISK_MODEL.bands[RISK_MODEL.bands.length - 1];
}

function riskBandBadgeClass(label) {
  return label === "Low" ? "continue" : label === "Moderate" ? "hold" : "stop";
}

function checkboxRow(label, key, extraHtml) {
  return `<label><input type="checkbox" ${state[key] ? "checked" : ""} onchange="state.${key}=this.checked; renderStep();" /> ${label}</label>${state[key] && extraHtml ? extraHtml : ""}`;
}

function renderStep() {
  renderStepper();
  const area = document.getElementById("stepArea");
  document.getElementById("reviewArea").style.display = currentStep === 7 ? "block" : "none";
  if (currentStep === 7) { buildReview(); area.innerHTML = ""; autosaveState(); return; }

  let html = "";
  if (currentStep === 0) {
    html = renderDraftsCard() + `<div class="card"><h2>Patient & referral</h2>
      <p class="hint">Dictate these first, or leave blank and fill in later &mdash; use a de-identified reference for any testing.</p>
      <div class="row"><div>${field("Patient / case reference", "patientName")}</div><div>${field("Date of birth", "dob")}</div></div>
      ${dateField("Date of consultation", "consultDate")}
      ${field("Reason for referral", "reasonForReferral", { textarea: true })}
    </div>`;
  } else if (currentStep === 1) {
    html = `<div class="card"><h2>History & findings</h2>
      <p class="hint">Dictate naturally &mdash; speak each section, pause between them.</p>
      ${field("Chief complaint / reason for visit", "chiefComplaint", { textarea: true })}
      ${field("Relevant medical history", "medHistory", { textarea: true, hint: "conditions, medications, allergies, smoking status" })}
      ${field("Extra-oral examination", "extraOral", { textarea: true })}
      ${field("Intra-oral / periodontal examination", "intraOral", { textarea: true })}
      ${field("Site-specific findings (FDI tooth numbers)", "sites")}
      ${field("Imaging reviewed & findings", "imaging", { textarea: true, hint: "OPG / CBCT / periapical" })}
      ${field("Diagnosis", "diagnosis", { textarea: true })}
      ${field("Prognosis", "prognosis", { textarea: true })}
      ${field("Treatment plan (narrative)", "treatmentPlanNotes", { textarea: true, hint: "free-text summary; the coded procedure is chosen next" })}
    </div>`;
  } else if (currentStep === 2) {
    html = `<div class="card"><h2>Procedure & risks</h2>
      <p class="hint">Choose the procedure from your Surgical Protocols hierarchy &mdash; item codes populate automatically.</p>
      <label>Procedure</label>
      <select onchange="state.procedurePath=this.value; renderStep();">
        <option value="">-- select --</option>
        ${DATA.leaves.map(l => `<option value="${esc(l.path)}" ${state.procedurePath === l.path ? "selected" : ""}>${l.path}</option>`).join("")}
      </select>
      <div id="codePreview"></div>
      <label style="margin-top:20px;">Procedure Codes</label>
      <div class="row">
        <div style="flex:2;"><input type="text" id="extraCodeInput" placeholder="add another item code (e.g. 981)" value="${esc(state.pendingExtraCode)}" oninput="state.pendingExtraCode=this.value" /></div>
        <div style="flex:1;"><input type="text" placeholder="FDI tooth (optional)" value="${esc(state.pendingExtraFdi)}" oninput="state.pendingExtraFdi=this.value" /></div>
        <div style="flex:0 0 auto;"><button onclick="addExtraCode()">+ Add code</button></div>
      </div>
      ${renderExtraCodes()}
      ${field("Treatment options discussed", "optionsDiscussed", { textarea: true, hint: "alternatives, including no treatment" })}
      ${field("Risks discussed", "riskDiscussion", { textarea: true, hint: "procedure-specific risks, for consent" })}
      <div class="row"><div>${yesNoField("Consent obtained", "consent")}</div><div>${dateField("Date consent obtained", "consentDate")}</div></div>
      ${yesNoField("Dental Implant Registry (DIR) consent obtained", "dirConsent", "patient consents to their data and device details being added to the DIR database")}
    </div>`;
  } else if (currentStep === 3) {
    html = `<div class="card"><h2>Materials</h2>
      <p class="hint">Selections pull from your Implant Systems and Bone Graft catalogues. Add as many implants/grafts as the case needs.</p>

      <label>Anaesthesia for this case</label>
      <select onchange="state.anaesthesiaType=this.value">
        <option value="">-- select --</option>
        <option value="Local Anaesthetic" ${state.anaesthesiaType === "Local Anaesthetic" ? "selected" : ""}>Local Anaesthetic</option>
        <option value="IV Sedation" ${state.anaesthesiaType === "IV Sedation" ? "selected" : ""}>IV Sedation</option>
      </select>

      <label style="margin-top:14px;">Local anaesthetic used (required)</label>
      <div class="row">
        <div style="flex:2;">
          <select onchange="state.pendingAnaesthetic=this.value">
            <option value="">-- select --</option>
            ${LA_OPTIONS.map(o => `<option value="${esc(o)}" ${state.pendingAnaesthetic === o ? "selected" : ""}>${o}</option>`).join("")}
          </select>
        </div>
        <div style="flex:0 0 auto;"><button onclick="addAnaesthetic()">+ Add Anaesthetic</button></div>
      </div>
      ${renderSelectedAnaesthetics()}

      <label style="margin-top:20px;">Implant system</label>
      <div class="row">
        <div>${implantManufacturerSelect()}</div>
        <div>${implantLineSelect()}</div>
      </div>
      <div class="row">
        <div>${implantDiameterSelect()}</div>
        <div>${implantLengthSelect()}</div>
        <div style="flex:0 0 auto;"><button onclick="addImplant()">+ Add implant</button></div>
      </div>
      ${renderSelectedImplants()}
      ${selectField("Cover screw / healing cap", "coverScrewType", COVER_SCREW_OPTIONS)}
      <input type="text" placeholder="notes (e.g. quantity, size)" value="${esc(state.coverScrewNotes)}" oninput="state.coverScrewNotes=this.value" style="margin:0 0 8px;" />

      <label style="margin-top:20px;">Bone graft / biomaterial</label>
      <div class="row">
        <div>${graftBrandSelect()}</div>
        <div>${graftCategorySelect()}</div>
        <div>${graftProductSelect()}</div>
        <div style="flex:0 0 auto;"><button onclick="addGraft()">+ Add graft</button></div>
      </div>
      ${renderSelectedGrafts()}
      <label style="margin:4px 0;">Bone graft / biomaterial comments</label>
      <textarea placeholder="e.g. site preparation, membrane used, volume placed" oninput="state.graftNotes=this.value">${state.graftNotes}</textarea>
      ${checkboxRow("Membrane fixation pins / tacks", "membranePins")}
      <label style="margin-top:14px;">PRF / PRP kit</label>
      <div class="row">
        <div>${selectField("Red PRF", "prfRedCount", PRF_COUNT_OPTIONS)}</div>
        <div>${selectField("Green PRF", "prfGreenCount", PRF_COUNT_OPTIONS)}</div>
      </div>

      ${checkboxRow("Suture material", "suture", sutureExtra())}
      <label style="margin:4px 0;">Suture notes</label>
      <input type="text" placeholder="e.g. technique, number of sutures" value="${esc(state.sutureNotes)}" oninput="state.sutureNotes=this.value" />
      ${checkboxRow("Surgical stent / guide", "surgicalStent")}

      <label style="margin-top:20px;">Imaging on day (required)</label>
      <select onchange="state.imagingType=this.value">
        <option value="">-- select --</option>
        <option value="CBCT" ${state.imagingType === "CBCT" ? "selected" : ""}>CBCT</option>
        <option value="OPG" ${state.imagingType === "OPG" ? "selected" : ""}>OPG</option>
        <option value="PA" ${state.imagingType === "PA" ? "selected" : ""}>Periapical (PA)</option>
      </select>

      <div class="row" style="margin-top:20px;">
        <div>${multiCheckboxGroup("Antibiotics intraop", "antibioticsIntraop", ANTIBIOTIC_OPTIONS)}</div>
        <div>${multiCheckboxGroup("Antibiotic post-op", "antibioticsPostop", ANTIBIOTIC_OPTIONS)}</div>
      </div>

      ${field("Sizes, quantities or other material notes", "materialNotes", { textarea: true })}
    </div>`;
  } else if (currentStep === 4) {
    html = `<div class="card"><h2>Day surgery (optional)</h2>
      <p class="hint">Only needed for sedation/GA cases &mdash; skip if this is a straightforward local-anaesthetic visit.</p>
      <label>Does this case require a pre-anaesthetic consultation?</label>
      <select onchange="state.daySurgeryNeeded=this.value; renderStep();">
        <option value="no" ${state.daySurgeryNeeded === "no" ? "selected" : ""}>No</option>
        <option value="yes" ${state.daySurgeryNeeded === "yes" ? "selected" : ""}>Yes</option>
      </select>
      <div class="row"><div>${selectField("ASA classification", "asa", ["ASA I", "ASA II", "ASA III", "ASA IV"])}</div><div>${selectField("Anaesthesia requested", "anaesthesia", ANAESTHESIA_REQUIRED_OPTIONS)}</div></div>
      <div class="row"><div>${selectField("Estimated duration", "duration", DURATION_OPTIONS)}</div><div>${yesNoField("Fasting requirement discussed", "fasting")}</div></div>
      ${yesNoField("Escort & aftercare arranged", "escort")}
      ${field("Relevant medical conditions", "dsMedicalConditions", { textarea: true, hint: "for your anaesthetic colleague" })}
      ${field("Current medications", "dsMedications", { textarea: true })}
      ${field("Medication instructions", "dsMedicationInstructions", { textarea: true })}
      ${field("Allergies", "dsAllergies", { textarea: true })}
    </div>`;
  } else if (currentStep === 5) {
    html = `<div class="card"><h2>Perioperative medications</h2>
      <div class="med-disclaimer">${esc(MED_DATA.meta.validation_status)} &mdash; This is decision <u>support</u> only. Cross-check every recommendation against your treating anaesthetist and current institutional protocol before acting on it. It does not replace clinical judgement for the individual patient.</div>
      <p class="hint">Ruleset v${esc(MED_DATA.meta.version)}, compiled ${esc(MED_DATA.meta.compiled_date)}. Add the patient's current medications below to see structured pre/intra/post-op guidance per drug class.</p>

      <label>Procedure bleeding-risk category (for this case)</label>
      <select onchange="state.perioperativeBleedRisk=this.value; renderStep();">
        <option value="" ${state.perioperativeBleedRisk === "" ? "selected" : ""}>-- general guidance (no dental-specific variant) --</option>
        <option value="low_bleed_risk" ${state.perioperativeBleedRisk === "low_bleed_risk" ? "selected" : ""}>Low bleeding risk (e.g. simple extraction, single implant)</option>
        <option value="mod_high_bleed_risk" ${state.perioperativeBleedRisk === "mod_high_bleed_risk" ? "selected" : ""}>Moderate/high bleeding risk (e.g. multiple extractions, implant + grafting)</option>
      </select>

      <label style="margin-top:16px;">Add a current medication</label>
      <div class="row">
        <div style="flex:2;"><input type="text" placeholder="brand or generic name, e.g. Clexane, apixaban, Eliquis" value="${esc(state.pendingMedQuery)}" oninput="state.pendingMedQuery=this.value" /></div>
        <div style="flex:0 0 auto;"><button onclick="addMedication()">+ Add</button></div>
      </div>
      ${renderMedList()}
    </div>`;
  } else if (currentStep === 6) {
    const riskScore = computeRiskScore();
    const band = riskBandFor(riskScore.total);
    html = `<div class="card"><h2>Patient risk indicator (pilot) &mdash; v${esc(RISK_MODEL.version)}</h2>
      <div class="med-disclaimer">${esc(RISK_MODEL.status)}</div>
      <p class="hint">Literature-informed points system estimating relative implant complication/failure risk (composite score 0&ndash;${RISK_MODEL.scoreMax}). This is a pilot decision-support tool, not a validated clinical score &mdash; use alongside your own clinical judgement, never in place of it.</p>

      <div class="med-card">
        <h4>Composite score: ${riskScore.total} / ${RISK_MODEL.scoreMax}
          <span class="med-badge ${riskBandBadgeClass(band.label)}">${esc(band.label)} risk</span>
        </h4>
        <p>Approximate published baseline for this band: ${esc(band.pct)}${band.note ? " (" + esc(band.note) + ")" : ""}</p>
        <p class="src">${riskScore.answered} of ${riskScore.total_factors} factors entered${riskScore.answered < riskScore.total_factors ? " &mdash; score will change as you complete the rest" : ""}</p>
        ${riskScore.breakdown.length ? `<p><strong>Contributing factors:</strong> ${riskScore.breakdown.map(esc).join("; ")}</p>` : `<p class="hint" style="margin:4px 0 0;">No risk-adding factors selected yet.</p>`}
      </div>

      ${RISK_MODEL.factors.map(riskFactorField).join("")}

      ${field("Antibiotic allergy considerations", "riskAntibioticAllergy", { textarea: true, hint: "planning flag only — not scored; changes prescribing, not complication probability" })}

      <details style="margin-top:16px;">
        <summary style="cursor:pointer; font-size:12.5px; color:var(--muted);">Caveats (click to review)</summary>
        <ul style="font-size:12.5px; color:var(--muted);">${RISK_MODEL.caveats.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
      </details>
    </div>`;
  }

  html += `<div class="btns">
    <button class="ghost" onclick="prevStep()" ${currentStep === 0 ? "disabled" : ""}>Back</button>
    <button onclick="nextStep()">${currentStep === 6 ? "Review & generate" : "Next"}</button>
  </div>`;
  area.innerHTML = html;

  if (currentStep === 2) updateCodePreview();
  autosaveState();
}

function sutureExtra() {
  return `<select onchange="state.sutureGauge=this.value" style="margin:4px 0 8px 24px; width:calc(100% - 24px);">
    <option value="">-- gauge --</option>
    ${SUTURE_OPTIONS.map(o => `<option value="${o}" ${state.sutureGauge === o ? "selected" : ""}>${o}</option>`).join("")}
  </select>`;
}

function fdiInputHtml(code) {
  const val = state.codeFdiMap[code] || "";
  return `<input type="text" class="fdi-input" placeholder="FDI tooth" value="${esc(val)}" oninput="state.codeFdiMap['${code}']=this.value" title="Tooth/site (FDI notation) for code ${code}" />`;
}

function updateCodePreview() {
  const leaf = DATA.leaves.find(l => l.path === state.procedurePath);
  const el = document.getElementById("codePreview");
  if (!leaf && state.extraCodes.length === 0) { el.innerHTML = ""; return; }
  const codes = leaf ? leaf.codes.split(",").map(c => c.trim()) : [];
  el.innerHTML = `<div class="flag"><strong>ADA item codes</strong> <span class="opt">&mdash; enter the FDI tooth/site each code applies to</span>` +
    codes.map(c => {
      const ref = DATA.codes.find(x => x.code === c);
      return `<div class="code-row"><span class="code-pill" title="${ref ? esc(ref.desc) : 'not in reference tab'}">${c}</span>${fdiInputHtml(c)}</div>`;
    }).join("") + `</div>`;
}

function renderExtraCodes() {
  if (!state.extraCodes.length) return "";
  return `<div style="margin:6px 0 10px;">${state.extraCodes.map((c, i) =>
    `<div class="code-row"><span class="code-pill">${c}</span>${fdiInputHtml(c)} <a href="#" onclick="removeExtraCode(${i}); return false;" style="color:#B3261E;">&times;</a></div>`
  ).join("")}</div>`;
}
function addExtraCode() {
  const v = (state.pendingExtraCode || "").trim();
  const fdi = (state.pendingExtraFdi || "").trim();
  if (v) {
    state.extraCodes.push(v);
    if (fdi) state.codeFdiMap[v] = fdi;
    state.pendingExtraCode = "";
    state.pendingExtraFdi = "";
  }
  renderStep();
}
function removeExtraCode(i) { state.extraCodes.splice(i, 1); renderStep(); }

function implantManufacturerSelect() {
  const manus = [...new Set(DATA.implants.map(i => i.manufacturer))];
  return `<label>Manufacturer</label><select onchange="state.pendingImplant.manufacturer=this.value; state.pendingImplant.line=''; state.pendingImplant.diameter=''; state.pendingImplant.length=''; renderStep();">
    <option value="">-- select --</option>
    ${manus.map(m => `<option value="${esc(m)}" ${state.pendingImplant.manufacturer === m ? "selected" : ""}>${m}</option>`).join("")}
  </select>`;
}
function implantLineSelect() {
  const lines = DATA.implants.filter(i => i.manufacturer === state.pendingImplant.manufacturer);
  return `<label>Sub-brand / product line</label><select onchange="state.pendingImplant.line=this.value; state.pendingImplant.diameter=''; state.pendingImplant.length=''; renderStep();" ${!state.pendingImplant.manufacturer ? "disabled" : ""}>
    <option value="">-- select --</option>
    ${lines.map(l => `<option value="${esc(l.line)}" ${state.pendingImplant.line === l.line ? "selected" : ""}>${l.line}</option>`).join("")}
  </select>`;
}
function currentImplantRow() {
  return DATA.implants.find(i => i.manufacturer === state.pendingImplant.manufacturer && i.line === state.pendingImplant.line);
}
function implantDiameterSelect() {
  const row = currentImplantRow();
  const opts = row ? row.diameterList : [];
  return `<label>Diameter (mm)</label><select onchange="state.pendingImplant.diameter=this.value; state.pendingImplant.length=''; renderStep();" ${!row ? "disabled" : ""}>
    <option value="">-- select --</option>
    ${opts.map(o => `<option value="${esc(o)}" ${state.pendingImplant.diameter === o ? "selected" : ""}>${o}</option>`).join("")}
  </select>`;
}
function lengthOptionsFor(row, diameter) {
  if (!row) return [];
  if (row.lengthByDiameter) return row.lengthByDiameter[diameter] || [];
  return row.lengthList || [];
}
function implantLengthSelect() {
  const row = currentImplantRow();
  const opts = lengthOptionsFor(row, state.pendingImplant.diameter);
  const needsDiameterFirst = row && row.lengthByDiameter && !state.pendingImplant.diameter;
  return `<label>Length (mm)</label><select onchange="state.pendingImplant.length=this.value;" ${!row || needsDiameterFirst ? "disabled" : ""}>
    <option value="">-- select --</option>
    ${opts.map(o => `<option value="${esc(o)}" ${state.pendingImplant.length === o ? "selected" : ""}>${o}</option>`).join("")}
  </select>`;
}
function addImplant() {
  const p = state.pendingImplant;
  if (!p.manufacturer || !p.line) return;
  const label = `${p.manufacturer} — ${p.line}` + (p.diameter ? ` — Ø${p.diameter}mm` : "") + (p.length ? ` x ${p.length}mm` : "");
  state.selectedImplants.push(label);
  state.pendingImplant = { manufacturer: "", line: "", diameter: "", length: "" };
  renderStep();
}
function removeImplant(i) { state.selectedImplants.splice(i, 1); renderStep(); }
function renderSelectedImplants() {
  if (!state.selectedImplants.length) return `<p class="hint">No implants added yet.</p>`;
  return `<ul>${state.selectedImplants.map((s, i) => `<li>${s} <a href="#" onclick="removeImplant(${i}); return false;" style="color:#B3261E;">remove</a></li>`).join("")}</ul>`;
}

function addAnaesthetic() {
  const v = (state.pendingAnaesthetic || "").trim();
  if (!v) return;
  state.selectedAnaesthetics.push(v);
  state.pendingAnaesthetic = "";
  renderStep();
}
function removeAnaesthetic(i) { state.selectedAnaesthetics.splice(i, 1); renderStep(); }
function renderSelectedAnaesthetics() {
  if (!state.selectedAnaesthetics.length) return `<p class="hint">No anaesthetics added yet.</p>`;
  return `<ul>${state.selectedAnaesthetics.map((s, i) => `<li>${s} <a href="#" onclick="removeAnaesthetic(${i}); return false;" style="color:#B3261E;">remove</a></li>`).join("")}</ul>`;
}

function graftBrandSelect() {
  const brands = [...new Set(DATA.grafts.map(g => g.brand))];
  return `<label>Brand</label><select onchange="state.pendingGraft.brand=this.value; state.pendingGraft.category=''; state.pendingGraft.product=''; renderStep();">
    <option value="">-- select --</option>
    ${brands.map(b => `<option value="${esc(b)}" ${state.pendingGraft.brand === b ? "selected" : ""}>${b}</option>`).join("")}
  </select>`;
}
function graftCategorySelect() {
  const cats = [...new Set(DATA.grafts.filter(g => g.brand === state.pendingGraft.brand).map(g => g.category))];
  return `<label>Category</label><select onchange="state.pendingGraft.category=this.value; state.pendingGraft.product=''; renderStep();" ${!state.pendingGraft.brand ? "disabled" : ""}>
    <option value="">-- select --</option>
    ${cats.map(c => `<option value="${esc(c)}" ${state.pendingGraft.category === c ? "selected" : ""}>${c}</option>`).join("")}
  </select>`;
}
function graftProductSelect() {
  const products = DATA.grafts.filter(g => g.brand === state.pendingGraft.brand && g.category === state.pendingGraft.category);
  return `<label>Product Type</label><select onchange="state.pendingGraft.product=this.value;" ${!state.pendingGraft.category ? "disabled" : ""}>
    <option value="">-- select --</option>
    ${products.map(p => `<option value="${esc(p.product)}" ${state.pendingGraft.product === p.product ? "selected" : ""}>${p.product}</option>`).join("")}
  </select>`;
}
function addGraft() {
  const p = state.pendingGraft;
  if (!p.brand || !p.category || !p.product) return;
  state.selectedGrafts.push(`${p.brand} — ${p.category} — ${p.product}`);
  state.pendingGraft = { brand: "", category: "", product: "" };
  renderStep();
}
function removeGraft(i) { state.selectedGrafts.splice(i, 1); renderStep(); }
function renderSelectedGrafts() {
  if (!state.selectedGrafts.length) return `<p class="hint">No grafts added yet.</p>`;
  return `<ul>${state.selectedGrafts.map((s, i) => `<li>${s} <a href="#" onclick="removeGraft(${i}); return false;" style="color:#B3261E;">remove</a></li>`).join("")}</ul>`;
}

function goToStep(i) { currentStep = i; renderStep(); }
function nextStep() { if (currentStep < 7) currentStep++; renderStep(); }
function prevStep() { if (currentStep > 0) currentStep--; renderStep(); }

// ---- Perioperative medications ----
const MED_ACTION_RANK = { stop: 3, hold: 2, continue: 1, unknown: 0 };

function matchMedication(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return null;
  let hit = MED_DATA.aliases.find(a => a.alias.toLowerCase() === q || a.genericName.toLowerCase() === q);
  if (!hit) hit = MED_DATA.aliases.find(a => a.alias.toLowerCase().includes(q) || a.genericName.toLowerCase().includes(q));
  return hit || null;
}

function medActionFor(classId) {
  const cls = MED_DATA.classes[classId];
  if (!cls) return { action: "unknown", timing: "", details: "" };
  const variantKey = state.perioperativeBleedRisk;
  if (variantKey && cls.procedure_variants && cls.procedure_variants[variantKey]) {
    return cls.procedure_variants[variantKey];
  }
  return cls.pre_op || { action: "unknown", timing: "", details: "" };
}

function addMedication() {
  const query = state.pendingMedQuery;
  if (!query || !query.trim()) return;
  const hit = matchMedication(query);
  if (!hit) {
    state.perioperativeMeds.push({ query: query.trim(), matched: false, classIds: [] });
  } else {
    state.perioperativeMeds.push({ query: query.trim(), matched: true, alias: hit.alias, genericName: hit.genericName, classIds: hit.classIds });
  }
  state.pendingMedQuery = "";
  renderStep();
}
function removeMedication(i) { state.perioperativeMeds.splice(i, 1); renderStep(); }

function medStatusBadge(entry) {
  if (!entry.matched || !entry.classIds.length) return { label: "not found", cls: "unknown" };
  let worst = { action: "continue" };
  entry.classIds.forEach(cid => {
    const a = medActionFor(cid);
    if (MED_ACTION_RANK[a.action] > MED_ACTION_RANK[worst.action]) worst = a;
  });
  const label = worst.action === "continue" ? "continue" : worst.action === "hold" ? "hold" : worst.action === "stop" ? "stop" : "unknown";
  return { label, cls: label };
}

function renderMedGuidanceCard(classId) {
  const cls = MED_DATA.classes[classId];
  if (!cls) return "";
  const a = medActionFor(classId);
  return `<div class="med-card">
    <h4>${esc(cls.name)}<span class="med-badge ${esc(a.action)}">${esc(a.action)}</span></h4>
    <p><strong>Pre-op:</strong> ${esc(a.timing)} ${a.details ? "&mdash; " + esc(a.details) : ""}</p>
    <p><strong>Intra-op:</strong> ${cls.intra_op ? esc(cls.intra_op.details || cls.intra_op) : "&mdash;"}</p>
    <p><strong>Post-op:</strong> ${cls.post_op ? esc(cls.post_op.details || cls.post_op) : "&mdash;"}</p>
    ${cls.notes ? `<p><strong>Notes:</strong> ${esc(cls.notes)}</p>` : ""}
    <p class="src">${esc(cls.guideline_source || "")} &middot; last reviewed ${esc(cls.last_reviewed || "")}</p>
  </div>`;
}

function renderMedList() {
  if (!state.perioperativeMeds.length) return `<p class="hint">No medications added yet.</p>`;
  return state.perioperativeMeds.map((entry, i) => {
    const badge = medStatusBadge(entry);
    const title = entry.matched ? `${entry.alias} (${entry.genericName})` : entry.query;
    const cards = entry.matched ? entry.classIds.map(renderMedGuidanceCard).join("") :
      `<p class="med-not-found">Not found in ruleset &mdash; needs manual review. Confirm with the treating clinician/anaesthetist.</p>`;
    return `<div class="med-card">
      <h4>${esc(title)}<span class="med-badge ${esc(badge.cls)}">${esc(badge.label)}</span>
        <a href="#" onclick="removeMedication(${i}); return false;" style="color:#B3261E; font-weight:normal; font-size:11.5px; margin-left:10px;">remove</a>
      </h4>
      ${cards}
    </div>`;
  }).join("");
}

function codesForPath() {
  const leaf = DATA.leaves.find(l => l.path === state.procedurePath);
  const base = leaf ? leaf.codes.split(",").map(c => c.trim()) : [];
  const all = [...base, ...state.extraCodes];
  return all.map(c => {
    const ref = DATA.codes.find(x => x.code === c);
    return { code: c, desc: ref ? ref.desc : "(not in your ADA reference tab)", fdi: state.codeFdiMap[c] || "" };
  });
}

function buildReview() {
  const codes = codesForPath();

  const reportHtml = `
    <h3>Clinician report</h3>
    <p><strong>Patient:</strong> ${state.patientName || "&mdash;"} &nbsp; <strong>DOB:</strong> ${state.dob || "&mdash;"}</p>
    <p><strong>Date of consultation:</strong> ${state.consultDate || "&mdash;"}</p>
    <p><strong>Reason for referral:</strong> ${state.reasonForReferral || "&mdash;"}</p>
    <p><strong>Chief complaint:</strong> ${state.chiefComplaint || "&mdash;"}</p>
    <p><strong>Relevant medical history:</strong> ${state.medHistory || "&mdash;"}</p>
    <p><strong>Extra-oral examination:</strong> ${state.extraOral || "&mdash;"}</p>
    <p><strong>Intra-oral / periodontal examination:</strong> ${state.intraOral || "&mdash;"}</p>
    <p><strong>Sites (FDI):</strong> ${state.sites || "&mdash;"}</p>
    <p><strong>Imaging reviewed & findings:</strong> ${state.imaging || "&mdash;"}</p>
    <p><strong>Diagnosis:</strong> ${state.diagnosis || "&mdash;"}</p>
    <p><strong>Prognosis:</strong> ${state.prognosis || "&mdash;"}</p>
    <p><strong>Treatment plan (narrative):</strong> ${state.treatmentPlanNotes || "&mdash;"}</p>
    <p><strong>Procedure (coded):</strong> ${state.procedurePath || "&mdash;"}</p>
    <p><strong>ADA item codes (tooth/site):</strong> ${codes.length ? codes.map(c => `${c.code}${c.fdi ? " (FDI " + c.fdi + ")" : ""}`).join(", ") : "&mdash;"}</p>
    <p><strong>Treatment options discussed:</strong> ${state.optionsDiscussed || "&mdash;"}</p>
    <p><strong>Risks discussed:</strong> ${state.riskDiscussion || "&mdash;"}</p>
    <p><strong>Consent obtained:</strong> ${state.consent || "&mdash;"}${state.consentDate ? " (" + state.consentDate + ")" : ""}</p>
    <p><strong>DIR consent obtained:</strong> ${state.dirConsent || "&mdash;"}</p>
    <div class="panel-copy-row"><button id="copyReportBtn" class="secondary" onclick="copyPanel('report', this)">📋 Copy clinician summary</button></div>
  `;
  document.getElementById("panel-report").innerHTML = reportHtml;

  const simpleChecked = [
    state.coverScrewType ? `${state.coverScrewType}${state.coverScrewNotes ? " (" + state.coverScrewNotes + ")" : ""}` : null,
    state.membranePins ? "Membrane fixation pins / tacks" : null,
    state.prfRedCount ? `Red PRF x${state.prfRedCount}` : null,
    state.prfGreenCount ? `Green PRF x${state.prfGreenCount}` : null,
    state.suture ? `Suture material${state.sutureGauge ? " (" + state.sutureGauge + ")" : ""}${state.sutureNotes ? " — " + state.sutureNotes : ""}` : null,
    state.surgicalStent ? "Surgical stent / guide" : null,
  ].filter(Boolean);

  const materialsHtml = `
    <h3>Material list</h3>
    <p><strong>Procedure:</strong> ${state.procedurePath || "&mdash;"}</p>
    <p><strong>Anaesthesia:</strong> ${state.anaesthesiaType || "&mdash;"}</p>
    <p><strong>Local anaesthetic(s):</strong></p>
    <ul>${state.selectedAnaesthetics.length ? state.selectedAnaesthetics.map(s => `<li>${s}</li>`).join("") : "<li>none selected</li>"}</ul>
    <p><strong>Implants:</strong></p>
    <ul>${state.selectedImplants.length ? state.selectedImplants.map(s => `<li>${s}</li>`).join("") : "<li>none selected</li>"}</ul>
    <p><strong>Bone grafts / biomaterials:</strong></p>
    <ul>${state.selectedGrafts.length ? state.selectedGrafts.map(s => `<li>${s}</li>`).join("") : "<li>none selected</li>"}</ul>
    <p><strong>Bone graft / biomaterial comments:</strong> ${state.graftNotes || "&mdash;"}</p>
    <p><strong>Imaging on day:</strong> ${state.imagingType || "&mdash;"}</p>
    <p><strong>Antibiotics &mdash; intraop:</strong> ${state.antibioticsIntraop.length ? state.antibioticsIntraop.join(", ") : "&mdash;"} &nbsp; <strong>post-op:</strong> ${state.antibioticsPostop.length ? state.antibioticsPostop.join(", ") : "&mdash;"}</p>
    <p><strong>Notes:</strong> ${state.materialNotes || "&mdash;"}</p>
    <p><strong>Checklist confirmed:</strong></p>
    <ul>${simpleChecked.length ? simpleChecked.map(i => `<li>${i}</li>`).join("") : "<li>none ticked yet &mdash; go back to the Materials step</li>"}</ul>
    <div class="panel-copy-row"><button id="copyMaterialsBtn" class="secondary" onclick="copyPanel('materials', this)">📋 Copy materials list</button></div>
  `;
  document.getElementById("panel-materials").innerHTML = materialsHtml;

  let quoteRows = codes.map((c) =>
    `<tr><td>${c.code}</td><td>${c.desc}</td><td>${c.fdi || "&mdash;"}</td></tr>`
  ).join("");
  const quoteHtml = `
    <h3>Quotation</h3>
    <p><strong>Patient:</strong> ${state.patientName || "&mdash;"} &nbsp; <strong>Procedure:</strong> ${state.procedurePath || "&mdash;"}</p>
    <table>
      <tr><th>Item code</th><th>Description</th><th>Tooth/site (FDI)</th></tr>
      ${quoteRows || "<tr><td colspan=3>No procedure selected</td></tr>"}
    </table>
    <div class="panel-copy-row"><button id="copyQuoteBtn" class="secondary" onclick="copyPanel('quote', this)">📋 Copy quotation</button></div>
  `;
  document.getElementById("panel-quote").innerHTML = quoteHtml;

  const dsHtml = `
    <h3>Day surgery summary</h3>
    <p class="hint">${state.daySurgeryNeeded === "yes" ? "Pre-anaesthetic consultation requested for this case &mdash; for your anaesthetic colleague." : "Marked as not requiring a pre-anaesthetic consultation, but details below are still included if entered."}</p>
    <p><strong>Pre-anaesthetic consultation required:</strong> ${state.daySurgeryNeeded === "yes" ? "Yes" : "No"}</p>
    <p><strong>Patient:</strong> ${state.patientName || "&mdash;"} &nbsp; <strong>DOB:</strong> ${state.dob || "&mdash;"}</p>
    <p><strong>Procedure:</strong> ${state.procedurePath || "&mdash;"}</p>
    <p><strong>ASA classification:</strong> ${state.asa || "&mdash;"}</p>
    <p><strong>Anaesthesia requested:</strong> ${state.anaesthesia || "&mdash;"}</p>
    <p><strong>Estimated duration:</strong> ${state.duration || "&mdash;"}</p>
    <p><strong>Fasting requirement discussed:</strong> ${state.fasting || "&mdash;"}</p>
    <p><strong>Escort & aftercare arranged:</strong> ${state.escort || "&mdash;"}</p>
    <p><strong>Relevant medical conditions:</strong> ${state.dsMedicalConditions || "&mdash;"}</p>
    <p><strong>Current medications:</strong> ${state.dsMedications || "&mdash;"}</p>
    <p><strong>Medication instructions:</strong> ${state.dsMedicationInstructions || "&mdash;"}</p>
    <p><strong>Allergies:</strong> ${state.dsAllergies || "&mdash;"}</p>
    <p><strong>Relevant medical history (from History & findings):</strong> ${state.medHistory || "&mdash;"}</p>
    <div class="panel-copy-row"><button id="copyDaySurgeryBtn" class="secondary" onclick="copyPanel('daysurgery', this)">📋 Copy day surgery summary</button></div>
  `;
  document.getElementById("panel-daysurgery").innerHTML = dsHtml;

  const bleedRiskLabel = state.perioperativeBleedRisk === "low_bleed_risk" ? "Low bleeding risk"
    : state.perioperativeBleedRisk === "mod_high_bleed_risk" ? "Moderate/high bleeding risk"
    : "Not specified";
  const perioHtml = `
    <h3>Perioperative medications</h3>
    <div class="med-disclaimer">${esc(MED_DATA.meta.validation_status)} &mdash; decision support only, cross-check against the treating clinician/anaesthetist and current institutional protocol.</div>
    <p><strong>Procedure bleeding-risk category:</strong> ${bleedRiskLabel}</p>
    ${renderMedList()}
    <div class="panel-copy-row"><button id="copyPerioBtn" class="secondary" onclick="copyPanel('perioperative', this)">📋 Copy perioperative meds</button></div>
  `;
  document.getElementById("panel-perioperative").innerHTML = perioHtml;

  const riskScoreForReview = computeRiskScore();
  const riskBandForReview = riskBandFor(riskScoreForReview.total);
  const riskHtml = `
    <h3>Patient risk indicator (pilot)</h3>
    <div class="med-disclaimer">${esc(RISK_MODEL.status)}</div>
    <p><strong>Composite score:</strong> ${riskScoreForReview.total} / ${RISK_MODEL.scoreMax} &mdash; <strong>${esc(riskBandForReview.label)} risk</strong> (${esc(riskBandForReview.pct)})</p>
    <p><strong>Factors entered:</strong> ${riskScoreForReview.answered} of ${riskScoreForReview.total_factors}</p>
    <p><strong>Contributing factors:</strong> ${riskScoreForReview.breakdown.length ? riskScoreForReview.breakdown.join("; ") : "none selected"}</p>
    <p><strong>Antibiotic allergy considerations:</strong> ${state.riskAntibioticAllergy || "&mdash;"}</p>
    <div class="panel-copy-row"><button id="copyRiskBtn" class="secondary" onclick="copyPanel('riskindicator', this)">📋 Copy risk indicator</button></div>
  `;
  document.getElementById("panel-riskindicator").innerHTML = riskHtml;

  renderFlagGate();
}

// ---- Confirm-before-finish gate: block copy/print/export until every AI flag is ticked ----
function allFlagsAcknowledged() {
  const flags = state.aiFlags || [];
  return flags.length === 0 || flags.every((_, i) => state.aiFlagsAcknowledged[i]);
}

function setActionButtonsDisabled(disabled) {
  ["copyReportBtn", "copyMaterialsBtn", "copyQuoteBtn", "copyDaySurgeryBtn", "copyPerioBtn", "copyRiskBtn", "printAllBtn", "exportPdfBtn"].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.disabled = disabled;
  });
}

function toggleFlagAck(i) {
  state.aiFlagsAcknowledged[i] = !state.aiFlagsAcknowledged[i];
  renderFlagGate();
}

function renderFlagGate() {
  const el = document.getElementById("flagGate");
  if (!el) return;
  const flags = state.aiFlags || [];
  if (!flags.length) { el.innerHTML = ""; setActionButtonsDisabled(false); return; }
  const allAcked = allFlagsAcknowledged();
  el.innerHTML = `<div class="flag">
    <strong>&#9888; Confirm ${flags.length} flagged item(s) from the AI fill before copying, printing, or exporting:</strong>
    <ul class="checklist">
      ${flags.map((f, i) => `<label><input type="checkbox" ${state.aiFlagsAcknowledged[i] ? "checked" : ""} onchange="toggleFlagAck(${i})" /> ${esc(f)}</label>`).join("")}
    </ul>
    ${allAcked ? "" : `<p class="hint" style="color:var(--danger); font-weight:bold; margin:4px 0 0;">Tick every item above to unlock the copy/print/export buttons.</p>`}
  </div>`;
  setActionButtonsDisabled(!allAcked);
}

// ---- Plain-text builders (for pasting into EHR / emailing to nursing — no HTML) ----
function textReport() {
  const codes = codesForPath();
  return [
    "CLINICIAN REPORT",
    `Patient: ${state.patientName || "-"}    DOB: ${state.dob || "-"}`,
    `Date of consultation: ${state.consultDate || "-"}`,
    `Reason for referral: ${state.reasonForReferral || "-"}`,
    `Chief complaint: ${state.chiefComplaint || "-"}`,
    `Relevant medical history: ${state.medHistory || "-"}`,
    `Extra-oral examination: ${state.extraOral || "-"}`,
    `Intra-oral / periodontal examination: ${state.intraOral || "-"}`,
    `Sites (FDI): ${state.sites || "-"}`,
    `Imaging reviewed & findings: ${state.imaging || "-"}`,
    `Diagnosis: ${state.diagnosis || "-"}`,
    `Prognosis: ${state.prognosis || "-"}`,
    `Treatment plan (narrative): ${state.treatmentPlanNotes || "-"}`,
    `Procedure (coded): ${state.procedurePath || "-"}`,
    `ADA item codes (tooth/site): ${codes.length ? codes.map(c => `${c.code}${c.fdi ? " (FDI " + c.fdi + ")" : ""}`).join(", ") : "-"}`,
    `Treatment options discussed: ${state.optionsDiscussed || "-"}`,
    `Risks discussed: ${state.riskDiscussion || "-"}`,
    `Consent obtained: ${state.consent || "-"}${state.consentDate ? " (" + state.consentDate + ")" : ""}`,
    `DIR consent obtained: ${state.dirConsent || "-"}`,
  ].join("\n");
}

function textMaterials() {
  const simpleChecked = [
    state.coverScrewType ? `${state.coverScrewType}${state.coverScrewNotes ? " (" + state.coverScrewNotes + ")" : ""}` : null,
    state.membranePins ? "Membrane fixation pins / tacks" : null,
    state.prfRedCount ? `Red PRF x${state.prfRedCount}` : null,
    state.prfGreenCount ? `Green PRF x${state.prfGreenCount}` : null,
    state.suture ? `Suture material${state.sutureGauge ? " (" + state.sutureGauge + ")" : ""}${state.sutureNotes ? " - " + state.sutureNotes : ""}` : null,
    state.surgicalStent ? "Surgical stent / guide" : null,
  ].filter(Boolean);
  return [
    "MATERIAL LIST",
    `Procedure: ${state.procedurePath || "-"}`,
    `Anaesthesia: ${state.anaesthesiaType || "-"}`,
    `Local anaesthetic(s): ${state.selectedAnaesthetics.length ? state.selectedAnaesthetics.join(", ") : "none selected"}`,
    `Implants: ${state.selectedImplants.length ? state.selectedImplants.join("; ") : "none selected"}`,
    `Bone grafts / biomaterials: ${state.selectedGrafts.length ? state.selectedGrafts.join("; ") : "none selected"}`,
    `Bone graft / biomaterial comments: ${state.graftNotes || "-"}`,
    `Imaging on day: ${state.imagingType || "-"}`,
    `Antibiotics - intraop: ${state.antibioticsIntraop.length ? state.antibioticsIntraop.join(", ") : "-"}    post-op: ${state.antibioticsPostop.length ? state.antibioticsPostop.join(", ") : "-"}`,
    `Notes: ${state.materialNotes || "-"}`,
    `Checklist confirmed: ${simpleChecked.length ? simpleChecked.join("; ") : "none ticked yet"}`,
  ].join("\n");
}

function textQuote() {
  const codes = codesForPath();
  const lines = [
    "QUOTATION",
    `Patient: ${state.patientName || "-"}    Procedure: ${state.procedurePath || "-"}`,
  ];
  if (codes.length) {
    codes.forEach(c => lines.push(`${c.code} - ${c.desc} - tooth/site (FDI): ${c.fdi || "-"}`));
  } else {
    lines.push("No procedure selected");
  }
  return lines.join("\n");
}

function textDaySurgery() {
  return [
    "DAY SURGERY SUMMARY",
    `Pre-anaesthetic consultation required: ${state.daySurgeryNeeded === "yes" ? "Yes" : "No"}`,
    `Patient: ${state.patientName || "-"}    DOB: ${state.dob || "-"}`,
    `Procedure: ${state.procedurePath || "-"}`,
    `ASA classification: ${state.asa || "-"}`,
    `Anaesthesia requested: ${state.anaesthesia || "-"}`,
    `Estimated duration: ${state.duration || "-"}`,
    `Fasting requirement discussed: ${state.fasting || "-"}`,
    `Escort & aftercare arranged: ${state.escort || "-"}`,
    `Relevant medical conditions: ${state.dsMedicalConditions || "-"}`,
    `Current medications: ${state.dsMedications || "-"}`,
    `Medication instructions: ${state.dsMedicationInstructions || "-"}`,
    `Allergies: ${state.dsAllergies || "-"}`,
    `Relevant medical history (from History & findings): ${state.medHistory || "-"}`,
  ].join("\n");
}

function textPerioperative() {
  const bleedRiskLabel = state.perioperativeBleedRisk === "low_bleed_risk" ? "Low bleeding risk"
    : state.perioperativeBleedRisk === "mod_high_bleed_risk" ? "Moderate/high bleeding risk"
    : "Not specified";
  const lines = [
    "PERIOPERATIVE MEDICATIONS",
    `${MED_DATA.meta.validation_status} - decision support only, cross-check against the treating clinician/anaesthetist and current institutional protocol.`,
    `Procedure bleeding-risk category: ${bleedRiskLabel}`,
    "",
  ];
  if (!state.perioperativeMeds.length) {
    lines.push("No medications added.");
  } else {
    state.perioperativeMeds.forEach(entry => {
      const badge = medStatusBadge(entry);
      const title = entry.matched ? `${entry.alias} (${entry.genericName})` : entry.query;
      lines.push(`${title} - ${badge.label.toUpperCase()}`);
      if (entry.matched) {
        entry.classIds.forEach(cid => {
          const cls = MED_DATA.classes[cid];
          if (!cls) return;
          const a = medActionFor(cid);
          lines.push(`  ${cls.name}: ${a.action}${a.timing ? " - " + a.timing : ""}${a.details ? " - " + a.details : ""}`);
        });
      } else {
        lines.push("  Not found in ruleset - needs manual review.");
      }
    });
  }
  return lines.join("\n");
}

function textRiskIndicator() {
  const riskScore = computeRiskScore();
  const band = riskBandFor(riskScore.total);
  return [
    "PATIENT RISK INDICATOR (PILOT)",
    `${RISK_MODEL.status}`,
    `Composite score: ${riskScore.total} / ${RISK_MODEL.scoreMax} - ${band.label.toUpperCase()} risk (${band.pct})`,
    `Factors entered: ${riskScore.answered} of ${riskScore.total_factors}`,
    `Contributing factors: ${riskScore.breakdown.length ? riskScore.breakdown.join("; ") : "none selected"}`,
    `Antibiotic allergy considerations: ${state.riskAntibioticAllergy || "-"}`,
  ].join("\n");
}

const PANEL_TEXT_BUILDERS = {
  report: textReport,
  materials: textMaterials,
  quote: textQuote,
  daysurgery: textDaySurgery,
  perioperative: textPerioperative,
  riskindicator: textRiskIndicator,
};

function fallbackCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch (e) { return false; }
}

function copyToClipboard(text, btnEl) {
  const flash = () => {
    if (!btnEl) return;
    const original = btnEl.dataset.label || btnEl.textContent;
    btnEl.dataset.label = original;
    btnEl.textContent = "✓ Copied";
    setTimeout(() => { btnEl.textContent = btnEl.dataset.label; }, 1500);
  };
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(flash).catch(() => { if (fallbackCopy(text)) flash(); });
  } else {
    if (fallbackCopy(text)) flash();
  }
}

function copyPanel(panelKey, btnEl) {
  const fn = PANEL_TEXT_BUILDERS[panelKey];
  if (!fn) return;
  copyToClipboard(fn(), btnEl);
}

function updateQuoteTotal() {
  const inputs = document.querySelectorAll("[id^=fee]");
  let total = 0;
  inputs.forEach(i => { total += parseFloat(i.value) || 0; });
  const totalEl = document.getElementById("quoteTotal");
  if (totalEl) totalEl.textContent = "$" + total.toFixed(2);
}

function setupTabs() {
  document.querySelectorAll(".out-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".out-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".out-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
    });
  });
}

function buildPrintHtml() {
  const panelIds = ["panel-report", "panel-materials", "panel-quote", "panel-daysurgery", "panel-perioperative", "panel-riskindicator"];
  return panelIds
    .map(id => document.getElementById(id))
    .filter(Boolean)
    .map(el => `<div class="print-page">${el.innerHTML}</div>`)
    .join('<div style="page-break-after: always;"></div>');
}

function printPanel() {
  document.getElementById("printArea").innerHTML = buildPrintHtml();
  window.print();
}

function exportPdf() {
  if (typeof html2pdf === "undefined") {
    alert("PDF export needs an internet connection to load the PDF library. Check your connection and try again, or use \"Print all documents\" and choose \"Save as PDF\" in the print dialog instead.");
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.style.padding = "10px";
  wrapper.innerHTML = buildPrintHtml();
  const nameSafe = (state.patientName || "case").toString().trim().replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "case";
  const dateSafe = (state.consultDate || new Date().toISOString().slice(0, 10));
  html2pdf().set({
    margin: 10,
    filename: `case-intake-${nameSafe}-${dateSafe}.pdf`,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  }).from(wrapper).save();
}

// ---- Block dictation + AI field-fill ----
// Approach: dictate (or upload/paste) the whole case as one block of text,
// then send that transcript to the Anthropic API, which returns a JSON object
// mapping it onto the app's fields for you to review before finishing.

const API_KEY_STORAGE = "dir_case_intake_anthropic_key";

function getApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ""; } catch (e) { return ""; }
}
function setApiKey(key) {
  try { localStorage.setItem(API_KEY_STORAGE, key); } catch (e) { /* ignore */ }
}
function clearApiKey() {
  try { localStorage.removeItem(API_KEY_STORAGE); } catch (e) { /* ignore */ }
}

// ---- Save / resume draft cases ----
const AUTOSAVE_KEY = "dir_case_intake_autosave";
const DRAFTS_KEY = "dir_case_intake_drafts";

function hasMeaningfulContent(s) {
  return !!(s.patientName || s.caseTranscript || s.procedurePath || s.chiefComplaint || s.diagnosis);
}

function autosaveState() {
  try {
    // Only ever write when there's something worth saving. Never delete here —
    // deletion is explicit (resume/discard/save-as-draft/open-draft) so an empty
    // in-memory state at boot can't silently wipe out a resumable autosave.
    if (!hasMeaningfulContent(state)) return;
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), step: currentStep, state }));
  } catch (e) { /* ignore */ }
}
function loadAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearAutosave() {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { /* ignore */ }
}

function loadDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveDrafts(drafts) {
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch (e) { /* ignore */ }
}

function saveCurrentAsDraft() {
  if (!hasMeaningfulContent(state)) { alert("Nothing to save yet — this case is still empty."); return; }
  const drafts = loadDrafts();
  const label = (state.patientName || "Untitled case") + " — " + new Date().toLocaleString();
  drafts.unshift({ id: Date.now(), label, savedAt: new Date().toISOString(), state: JSON.parse(JSON.stringify(state)) });
  saveDrafts(drafts);
  clearAutosave();
  resetState();
  currentStep = 0;
  renderStep();
}

function openDraft(id) {
  const drafts = loadDrafts();
  const draft = drafts.find(d => d.id === id);
  if (!draft) return;
  resetState();
  Object.assign(state, draft.state);
  currentStep = 0;
  clearAutosave();
  renderStep();
}

function deleteDraft(id) {
  const drafts = loadDrafts().filter(d => d.id !== id);
  saveDrafts(drafts);
  renderStep();
}

function renderDraftsCard() {
  const drafts = loadDrafts();
  const rows = drafts.map(d => `<li>${esc(d.label)}
      <a href="#" onclick="openDraft(${d.id}); return false;">open</a>
      &nbsp;|&nbsp;
      <a href="#" onclick="deleteDraft(${d.id}); return false;" style="color:#B3261E;">delete</a>
    </li>`).join("");
  return `<div class="card">
    <h2>Saved drafts ${drafts.length ? "(" + drafts.length + ")" : ""}</h2>
    <p class="hint">Save the case you're on to come back to it later, without losing anything.</p>
    <button type="button" class="secondary" onclick="saveCurrentAsDraft()">💾 Save this case as a draft &amp; start new</button>
    ${drafts.length ? `<ul style="margin-top:12px;">${rows}</ul>` : `<p class="hint" style="margin-top:12px;">No saved drafts yet.</p>`}
  </div>`;
}

function renderResumeBanner() {
  const el = document.getElementById("resumeBanner");
  if (!el) return;
  const saved = loadAutosave();
  if (!saved || !hasMeaningfulContent(saved.state)) { el.innerHTML = ""; return; }
  const label = saved.state.patientName || "an unsaved case";
  const when = new Date(saved.savedAt).toLocaleString();
  el.innerHTML = `<div class="flag" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
    <span>We found unsaved work on <strong>${esc(label)}</strong> from ${esc(when)}. Resume where you left off?</span>
    <span style="white-space:nowrap;">
      <button type="button" onclick="resumeAutosave()">Resume</button>
      <button type="button" class="ghost" onclick="discardAutosave()">Discard</button>
    </span>
  </div>`;
}

function resumeAutosave() {
  const saved = loadAutosave();
  if (!saved) return;
  resetState();
  Object.assign(state, saved.state);
  currentStep = saved.step || 0;
  document.getElementById("resumeBanner").innerHTML = "";
  renderStep();
}

function discardAutosave() {
  clearAutosave();
  const el = document.getElementById("resumeBanner");
  if (el) el.innerHTML = "";
}

function supportsSpeech() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

const SPEECH_ERROR_MESSAGES = {
  "not-allowed": "Microphone access was blocked. Check the site permission (click the icon in the address bar) and make sure this page is allowed to use the microphone.",
  "service-not-allowed": "The browser blocked the speech recognition service. This usually happens when a file is opened directly (file://) instead of served over http/https, or in some privacy-focused browsers (e.g. Brave) that block it by default. Try Chrome, or run this file via a local server / hosting.",
  "network": "Speech recognition needs an internet connection to reach the browser's speech service, and none was detected (or it was blocked, e.g. by Brave Shields). Check your connection/browser and try again.",
  "audio-capture": "No microphone was detected. Check that a microphone is connected and selected in your system settings.",
  "aborted": null,
  "no-speech": null,
};

let recognition = null;
let recognizingBlock = false;

function toggleBlockDictation() {
  const btn = document.getElementById("blockMicBtn");
  const el = document.getElementById("caseTranscriptBox");

  if (!supportsSpeech()) {
    alert("Live dictation isn't supported in this browser. Try Chrome or Edge, or paste an existing transcript / upload an audio file instead.");
    return;
  }
  if (recognizingBlock) {
    if (recognition) recognition.stop();
    return;
  }
  if (window.isSecureContext === false) {
    alert("This page isn't running in a \"secure context\" (https or localhost), so the browser will likely block speech recognition. Run it via a local server or host it online.");
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-AU";
  recognizingBlock = true;
  if (btn) { btn.classList.add("listening"); btn.textContent = "⏹ Stop dictating"; }

  let finalText = state.caseTranscript || "";

  recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalText += (finalText && !/\s$/.test(finalText) ? " " : "") + transcript.trim();
      } else {
        interim += transcript;
      }
    }
    state.caseTranscript = finalText;
    if (el) el.value = finalText + (interim ? " " + interim : "");
  };
  recognition.onerror = (e) => {
    if (btn) { btn.classList.remove("listening"); btn.textContent = "🎤 Start dictating"; }
    const msg = SPEECH_ERROR_MESSAGES.hasOwnProperty(e.error) ? SPEECH_ERROR_MESSAGES[e.error] : `Speech recognition error: ${e.error}`;
    if (msg) alert(msg);
  };
  recognition.onend = () => {
    recognizingBlock = false;
    if (btn) { btn.classList.remove("listening"); btn.textContent = "🎤 Start dictating"; }
    if (el) el.value = state.caseTranscript || "";
  };
  try {
    recognition.start();
  } catch (err) {
    recognizingBlock = false;
    if (btn) { btn.classList.remove("listening"); btn.textContent = "🎤 Start dictating"; }
    alert("Couldn't start dictation: " + err.message);
  }
}

function handleAudioUpload(input) {
  const file = input.files && input.files[0];
  const wrap = document.getElementById("audioPlayerWrap");
  if (!file || !wrap) return;
  const url = URL.createObjectURL(file);
  wrap.innerHTML = `
    <audio id="uploadedAudio" controls src="${url}" style="width:100%; margin-top:8px;"></audio>
    <p class="hint" style="margin-top:6px;">Browsers can't automatically transcribe an uploaded recording offline. Either: play it aloud near your microphone and click "Start dictating" at the same time so the mic picks it up, or paste an existing written transcript straight into the box below.</p>
  `;
}

function setStatus(msg, kind) {
  const el = document.getElementById("aiStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.className = "ai-status" + (kind ? " " + kind : "");
}

function renderDictationArea() {
  const area = document.getElementById("dictationArea");
  if (!area) return;
  const key = getApiKey();
  area.innerHTML = `
    <div class="card">
      <h2>Dictate the whole case, then let AI sort it into fields</h2>
      <p class="hint">Speak through the entire case once &mdash; patient details, history, procedure, materials, day surgery &mdash; then click "Fill fields with AI". Review every field afterwards before finishing; nothing is submitted anywhere on your behalf.</p>

      <div class="row" style="align-items:center; gap:10px; margin-bottom:10px;">
        <button type="button" id="blockMicBtn" onclick="toggleBlockDictation()">&#127908; Start dictating</button>
        <label style="margin:0; font-weight:normal; font-size:13px;">or upload an audio file: <input type="file" accept="audio/*" onchange="handleAudioUpload(this)" /></label>
      </div>
      <div id="audioPlayerWrap"></div>

      <textarea id="caseTranscriptBox" style="min-height:160px;" placeholder="Dictate, or paste an existing transcript here..." oninput="state.caseTranscript=this.value">${state.caseTranscript || ""}</textarea>

      <div class="row" style="align-items:center; gap:10px; margin-top:12px;">
        <button type="button" onclick="fillFieldsWithAI()">Fill fields with AI</button>
        ${key
          ? `<span class="hint" style="margin:0;">API key saved &#10003; <a href="#" onclick="changeApiKey(); return false;">change</a></span>`
          : `<span class="hint" style="margin:0;">No API key saved yet &mdash; you'll be asked for one.</span>`}
      </div>
      <p id="aiStatus" class="ai-status"></p>
      <div id="aiReviewBox"></div>
      <p class="dictation-note">Only use de-identified/dummy patient details while this is a pilot tool &mdash; the transcript is sent to Anthropic's API to be parsed into fields.</p>
    </div>
  `;
  renderAiReviewBox();
}

function renderAiReviewBox() {
  const el = document.getElementById("aiReviewBox");
  if (!el) return;
  const corrections = state.aiCorrections || [];
  const flags = state.aiFlags || [];
  if (!corrections.length && !flags.length) { el.innerHTML = ""; return; }
  let html = "";
  if (flags.length) {
    html += `<div class="flag"><strong>&#9888; Please double-check ${flags.length} item(s) before relying on them:</strong>
      <ul>${flags.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
    </div>`;
  }
  if (corrections.length) {
    html += `<details style="margin-top:8px;">
      <summary style="cursor:pointer; font-size:12.5px; color:var(--muted);">${corrections.length} term(s) auto-corrected from the raw transcript (click to review)</summary>
      <ul style="font-size:12.5px; color:var(--muted);">${corrections.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
    </details>`;
  }
  el.innerHTML = html;
}

function changeApiKey() {
  const existing = getApiKey();
  const val = prompt("Paste your Anthropic API key (starts with sk-ant-...). It's stored only in this browser.", existing);
  if (val === null) return;
  if (val.trim() === "") { clearApiKey(); } else { setApiKey(val.trim()); }
  renderDictationArea();
}

const BASE_DENTAL_VOCAB = [
  "periodontal", "periodontitis", "periodontist", "gingivitis", "osseointegration",
  "extraction socket", "sinus lift", "guided bone regeneration", "GBR", "flap surgery",
  "cover screw", "healing abutment", "surgical stent", "surgical guide", "sutures", "suturing",
  "peri-implantitis", "peri-implant mucositis", "bruxism", "occlusion", "malocclusion",
  "FDI notation", "tooth number", "ASA classification", "ASA I", "ASA II", "ASA III", "ASA IV",
  "pre-anaesthetic consultation", "day surgery", "IV sedation", "general anaesthesia", "local anaesthetic",
  "informed consent", "Dental Implant Registry", "DIR consent",
  "anticoagulant", "antiplatelet", "warfarin", "clopidogrel", "apixaban", "rivaroxaban", "dabigatran",
  "aspirin", "bisphosphonate", "denosumab", "MRONJ", "osteonecrosis of the jaw",
  "metformin", "insulin", "diabetes mellitus", "hypertension", "beta blocker", "statin",
  "penicillin allergy", "NSAID", "corticosteroid", "immunosuppressant",
  "fasting requirement", "escort and aftercare", "nil by mouth", "NBM",
  "bone graft", "biomaterial", "membrane", "PRF", "PRP", "connective tissue graft", "CTG",
  "recession", "gingival recession", "root coverage", "frenectomy", "gingivectomy",
  "open flap debridement", "root resection", "full mouth", "half mouth", "quadrant",
  "OPG", "CBCT", "cone beam", "periapical radiograph", "panoramic radiograph",
];

function buildDomainVocabulary() {
  const terms = new Set(BASE_DENTAL_VOCAB);
  DATA.leaves.forEach(l => l.path.split(">").forEach(part => terms.add(part.trim())));
  DATA.codes.forEach(c => terms.add(c.desc));
  DATA.implants.forEach(i => { terms.add(i.manufacturer); terms.add(i.line); });
  DATA.grafts.forEach(g => { terms.add(g.category); terms.add(g.product); });
  return Array.from(terms).filter(Boolean);
}

function buildAiPrompt(transcript) {
  const leafPaths = DATA.leaves.map(l => l.path);
  const vocab = buildDomainVocabulary();
  const schemaLines = AI_FILLABLE_FIELDS.map(([key, type, label]) => {
    if (type === "enum:leaves") return `  "${key}": string  // ${label}. Must be exactly one of the allowed procedure paths, or "" if unclear.`;
    if (type === "enum:yesno") return `  "${key}": "yes" | "no" | ""  // ${label}`;
    if (type === "enum:yesno_cap") return `  "${key}": "Yes" | "No" | ""  // ${label}`;
    if (type === "enum:asa") return `  "${key}": "ASA I" | "ASA II" | "ASA III" | "ASA IV" | ""  // ${label}`;
    if (type === "enum:duration") return `  "${key}": ${DURATION_OPTIONS.map(d => `"${d}"`).join(" | ")} | ""  // ${label}. Round to the closest listed option.`;
    if (type === "enum:anaesthesia") return `  "${key}": ${ANAESTHESIA_REQUIRED_OPTIONS.map(d => `"${d}"`).join(" | ")} | ""  // ${label}`;
    return `  "${key}": string  // ${label}. Use "" if not mentioned — never invent information.`;
  }).join("\n");

  return `You are helping a dental/periodontal clinician turn a spoken case dictation into structured fields for an internal case-intake tool. This is real clinical documentation that will inform patient care, an EHR entry, and a nursing materials order — accuracy matters more than completeness.

The transcript comes from a browser's free speech-to-text engine, which frequently mishears dental/medical terminology as similar-sounding everyday words or names (e.g. "periodly Harry operatively" for "periodontal therapy", "graphic materials ethos" for "graft materials, EthOss", "Paul clinical examination" for "on clinical examination"). Before extracting fields, silently correct these obvious mishearings using the domain vocabulary below, then extract ONLY what was actually said (as corrected). Do not invent or infer clinical facts that aren't present in the transcript even after correction — if something wasn't mentioned, use an empty string.

SAFETY-CRITICAL RULE — never guess: for any number, measurement, dose, drug name, tooth/FDI number, or item code, only fill it in if you are confident that is genuinely what was said (after correcting an obvious mishearing). If the audio is ambiguous, garbled, or could plausibly be more than one specific number/name, do NOT silently pick one — instead put your best-effort reading in the field AND add a clear entry to "_flags" naming the field and exactly what is uncertain (e.g. "sites: heard 'tooth two four or tooth two six, unclear which' — confirm against the recording"). It is always better to flag a doubt than to let a wrong number or drug name pass through unnoticed.

Known dental/clinical vocabulary that may have been mis-transcribed (procedure names, implant/graft product names, ADA item code descriptions):
${vocab.map(v => "- " + v).join("\n")}

Return ONLY a single JSON object (no markdown fences, no commentary) with exactly these keys:
{
${schemaLines}
  "_corrections": string[]  // one short entry per mishearing you silently fixed, in the form "heard '...', corrected to '...'". Empty array if none were needed.
  "_flags": string[]  // one short entry per field where you are not fully confident, per the safety-critical rule above. Empty array if none.
}

Allowed procedure paths for "procedurePath" (pick the closest exact match, or "" if none fit):
${leafPaths.map(p => "- " + p).join("\n")}

Transcript:
"""
${transcript}
"""`;
}

async function fillFieldsWithAI() {
  const transcript = (state.caseTranscript || "").trim();
  if (!transcript) { alert("Dictate or paste the case transcript first."); return; }

  let key = getApiKey();
  if (!key) {
    const val = prompt("Paste your Anthropic API key (starts with sk-ant-...). It's stored only in this browser, never sent to anyone but Anthropic.");
    if (!val) return;
    key = val.trim();
    setApiKey(key);
    renderDictationArea();
  }

  setStatus("Sending transcript to AI for sorting into fields...", "loading");

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2600,
        temperature: 0,
        messages: [{ role: "user", content: buildAiPrompt(transcript) }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      setStatus(`AI request failed (${resp.status}). Check your API key and account credit. Details: ${errText.slice(0, 200)}`, "error");
      return;
    }

    const data = await resp.json();
    const raw = (data.content && data.content[0] && data.content[0].text) || "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      setStatus("The AI's response wasn't valid JSON — nothing was changed. Try again, or shorten/simplify the dictation.", "error");
      return;
    }

    let filledCount = 0;
    const validKeys = new Set(AI_FILLABLE_FIELDS.map(f => f[0]));
    for (const [k, v] of Object.entries(parsed)) {
      if (!validKeys.has(k)) continue;
      if (k === "procedurePath" && v && !DATA.leaves.some(l => l.path === v)) continue;
      if (k === "daySurgeryNeeded" && v !== "yes" && v !== "no") continue;
      if ((k === "fasting" || k === "escort" || k === "consent") && v !== "Yes" && v !== "No") continue;
      if (k === "asa" && v && !["ASA I", "ASA II", "ASA III", "ASA IV"].includes(v)) continue;
      if (k === "duration" && v && !DURATION_OPTIONS.includes(v)) continue;
      if (k === "anaesthesia" && v && !ANAESTHESIA_REQUIRED_OPTIONS.includes(v)) continue;
      if (typeof v === "string" && v.trim() !== "") {
        state[k] = v.trim();
        filledCount++;
      }
    }

    state.aiCorrections = Array.isArray(parsed._corrections) ? parsed._corrections.filter(x => typeof x === "string" && x.trim()) : [];
    state.aiFlags = Array.isArray(parsed._flags) ? parsed._flags.filter(x => typeof x === "string" && x.trim()) : [];
    state.aiFlagsAcknowledged = {};

    renderStep();
    renderAiReviewBox();
    const flagNote = state.aiFlags.length ? ` ${state.aiFlags.length} item(s) need your double-check — see below.` : "";
    setStatus(`Done — ${filledCount} field(s) filled.${flagNote} Go through each step and review/correct before finishing.`, "success");
  } catch (err) {
    setStatus("Couldn't reach the AI service: " + err.message, "error");
  }
}

renderDictationArea();
renderStep();
setupTabs();
renderResumeBanner();

window.state = state;
window.DATA = DATA;
window.MED_DATA = MED_DATA;
window.matchMedication = matchMedication;
window.addMedication = addMedication;
window.removeMedication = removeMedication;
window.medActionFor = medActionFor;
window.medStatusBadge = medStatusBadge;
window.renderMedList = renderMedList;
window.renderStep = renderStep;
window.buildReview = buildReview;
window.nextStep = nextStep;
window.goToStep = goToStep;
window.addImplant = addImplant;
window.addAnaesthetic = addAnaesthetic;
window.toggleMultiValue = toggleMultiValue;
window.removeAnaesthetic = removeAnaesthetic;
window.addGraft = addGraft;
window.removeGraft = removeGraft;
window.addExtraCode = addExtraCode;
window.toggleBlockDictation = toggleBlockDictation;
window.handleAudioUpload = handleAudioUpload;
window.fillFieldsWithAI = fillFieldsWithAI;
window.changeApiKey = changeApiKey;
window.getApiKey = getApiKey;
window.setApiKey = setApiKey;
window.supportsSpeech = supportsSpeech;
window.setToday = setToday;
window.buildDomainVocabulary = buildDomainVocabulary;
window.renderAiReviewBox = renderAiReviewBox;
window.textReport = textReport;
window.textMaterials = textMaterials;
window.textQuote = textQuote;
window.textDaySurgery = textDaySurgery;
window.textPerioperative = textPerioperative;
window.copyPanel = copyPanel;
window.copyToClipboard = copyToClipboard;
window.buildAiPrompt = buildAiPrompt;
window.resetState = resetState;
window.autosaveState = autosaveState;
window.loadAutosave = loadAutosave;
window.clearAutosave = clearAutosave;
window.loadDrafts = loadDrafts;
window.saveCurrentAsDraft = saveCurrentAsDraft;
window.openDraft = openDraft;
window.deleteDraft = deleteDraft;
window.resumeAutosave = resumeAutosave;
window.discardAutosave = discardAutosave;
window.renderResumeBanner = renderResumeBanner;
window.renderDraftsCard = renderDraftsCard;
window.exportPdf = exportPdf;
window.buildPrintHtml = buildPrintHtml;
window.printPanel = printPanel;
window.toggleFlagAck = toggleFlagAck;
window.allFlagsAcknowledged = allFlagsAcknowledged;
window.renderFlagGate = renderFlagGate;
window.setActionButtonsDisabled = setActionButtonsDisabled;
window.RISK_MODEL = RISK_MODEL;
window.computeRiskScore = computeRiskScore;
window.riskBandFor = riskBandFor;
window.riskBandBadgeClass = riskBandBadgeClass;
window.textRiskIndicator = textRiskIndicator;
window.setRiskFactor = setRiskFactor;
window.riskFactorField = riskFactorField;
