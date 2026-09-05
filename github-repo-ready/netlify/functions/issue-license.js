// netlify/functions/issue-license.js
//
// Called by license-success.html right after a Stripe Checkout redirect.
// Looks up the completed Checkout Session, works out what was purchased,
// generates (or reuses) a license code for that customer, and stores the
// mapping in Netlify Blobs so verify-license.js can check it later.

const Stripe = require("stripe");
const { getStore } = require("@netlify/blobs");

// Case Intake App - live Stripe price IDs -> what they unlock.
const PRICE_MAP = {
  "price_1UCFzuJy1ewXt5gjcbjNKa5k": { type: "tier", key: 1 },
  "price_1UCG02Jy1ewXt5gjAYcCEAeA": { type: "tier", key: 2 },
  "price_1UCG05Jy1ewXt5gjzLzjEpQL": { type: "tier", key: 3 },
  "price_1UCG08Jy1ewXt5gjoHLQDSJs": { type: "addon", key: "perioperative" }, // old $2/mo link, deactivated
  "price_1UCG0KJy1ewXt5gjv5TDpQ33": { type: "addon", key: "riskIndicator" }, // old $2/mo link, deactivated
  "price_1UCIDsJy1ewXt5gjg4gAnNFB": { type: "addon", key: "perioperative" }, // old $1.99/mo link, deactivated
  "price_1UCIEAJy1ewXt5gjIX46Gg74": { type: "addon", key: "riskIndicator" }, // old $1.99/mo link, deactivated
  "price_1UCIh0Jy1ewXt5gjXqxO9wgY": { type: "addon", key: "perioperative" }, // current $3.99/mo link
  "price_1UCIh5Jy1ewXt5gjBHtl6zwH": { type: "addon", key: "riskIndicator" }, // current $3.99/mo link
};

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I - avoids confusion when read aloud/typed
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `DIR-${s.slice(0, 4)}-${s.slice(4)}`;
}

exports.handler = async (event) => {
  const sessionId = (event.queryStringParameters || {}).session_id;
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing session_id" }) };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer", "subscription"],
    });

    const lineItem = session.line_items && session.line_items.data && session.line_items.data[0];
    const priceId = lineItem && lineItem.price && lineItem.price.id;
    const mapping = priceId && PRICE_MAP[priceId];
    if (!mapping) {
      return { statusCode: 400, body: JSON.stringify({ error: "Unrecognized price on this session" }) };
    }

    const customerId = typeof session.customer === "string" ? session.customer : (session.customer && session.customer.id);
    const email = session.customer_details && session.customer_details.email;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription && session.subscription.id);

    const licenses = getStore("licenses");
    const customers = getStore("customers");

    // If this customer already has a code (e.g. buying a second add-on later),
    // reuse it and just add the new entitlement rather than issuing a new one.
    let code = customerId ? await customers.get(customerId, { type: "text" }) : null;
    let record = code ? await licenses.get(code, { type: "json" }) : null;

    if (!record) {
      code = code || randomCode();
      record = { code, email: email || "", customerId: customerId || "", entitlements: [] };
    }

    // Replace any existing entitlement of the same kind/key (e.g. re-purchasing
    // the same tier after a lapse) rather than duplicating it.
    record.entitlements = (record.entitlements || []).filter(
      (e) => !(e.type === mapping.type && e.key === mapping.key)
    );
    record.entitlements.push({
      type: mapping.type,
      key: mapping.key,
      subscriptionId: subscriptionId || "",
      status: "active",
    });
    record.email = email || record.email || "";
    record.customerId = customerId || record.customerId || "";

    await licenses.setJSON(code, record);
    if (customerId) await customers.set(customerId, code);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email: record.email }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
