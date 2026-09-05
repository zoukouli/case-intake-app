// netlify/functions/verify-license.js
//
// Called by the app itself whenever someone enters a license code.
// Looks up the code, re-checks each linked Stripe subscription's live status
// (so a canceled/past-due subscription stops working even with an old code),
// and returns the effective tier + add-ons.

const Stripe = require("stripe");
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let code;
  try {
    code = (JSON.parse(event.body || "{}").code || "").trim();
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ valid: false, error: "Bad request" }) };
  }
  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ valid: false, error: "Missing code" }) };
  }

  try {
    const licenses = getStore("licenses");
    const record = await licenses.get(code, { type: "json" });
    if (!record) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valid: false }) };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let tier = 0;
    const addons = { perioperative: false, riskIndicator: false };
    let anyActive = false;

    for (const ent of record.entitlements || []) {
      let status = ent.status;
      if (ent.subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(ent.subscriptionId);
          status = sub.status; // active | trialing | past_due | canceled | unpaid ...
        } catch (e) {
          status = "canceled"; // subscription no longer exists / inaccessible
        }
      }
      const isActive = status === "active" || status === "trialing";
      if (!isActive) continue;
      anyActive = true;
      if (ent.type === "tier" && ent.key > tier) tier = ent.key;
      if (ent.type === "addon" && ent.key === "perioperative") addons.perioperative = true;
      if (ent.type === "addon" && ent.key === "riskIndicator") addons.riskIndicator = true;
    }

    if (tier >= 3) { addons.perioperative = true; addons.riskIndicator = true; }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valid: anyActive, tier, addons, email: record.email || "" }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ valid: false, error: err.message }) };
  }
};
