// Netlify Function: submit-lead.js
// Receives AI IQ Quiz data → appends row to Google Sheets (AI_IQ_Quiz_Leads tab)
// Adapted from email-outreach-machine pattern — no npm packages needed

const { createSign } = require("crypto");

const SHEET_ID = "1RHtpqWJMbQPhTTBzF2HU5hzg9SISutY_m40UU_vCleE";
const SHEET_TAB = "AI_IQ_Quiz_Leads";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// --- Google JWT auth (no googleapis package needed) ---
function makeJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const sigInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(sigInput);
  const sig = sign.sign(serviceAccount.private_key, "base64url");
  return `${sigInput}.${sig}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = makeJWT(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token: " + JSON.stringify(data));
  return data.access_token;
}

async function appendRow(token, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}!A1:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Sheets append failed: " + err);
  }
  return res.json();
}

// --- Main handler ---
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body || "{}");
    const { firstName, email, industry, score, totalCorrect, totalQuestions, categories, answers, completionTime } = body;

    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };

    // Parse service account from env
    const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const token = await getAccessToken(sa);

    // Build row: Timestamp, First Name, Email, Industry, Score%, Correct/Total, Time(s),
    //   then per-question: Q1-Q12 (correct/incorrect/timeout + time taken),
    //   then category scores
    const timestamp = new Date().toISOString();

    // Per-question summary: "Correct (3.2s)" or "Incorrect (5.1s)" or "Timeout"
    const answerCols = (answers || []).map((a, i) => {
      if (a.timedOut) return "Timeout";
      return `${a.isCorrect ? "Correct" : "Incorrect"} (${a.timeTaken}s)`;
    });

    // Category scores: "AI Skills Gap Awareness: 50%" — categories is an object {name:{correct,total}}
    const catScores = categories
      ? Object.entries(categories).map(([name, d]) => `${name}: ${Math.round(d.correct / d.total * 100)}%`).join(" | ")
      : "";

    const row = [
      timestamp,
      firstName || "",
      email,
      industry || "",
      score ?? "",
      `${totalCorrect}/${totalQuestions}`,
      completionTime ? `${completionTime}s` : "",
      ...answerCols,
      catScores,
    ];

    // Pad to ensure consistent columns (12 questions + 7 meta + 1 cats = 20 cols)
    while (row.length < 20) row.push("");
    // Columns U, V, W, X: Paid status, FollowUp1Sent, FollowUp2Sent, FollowUp3Sent (for email automation)
    row.push("FALSE", "FALSE", "FALSE", "FALSE");

    await appendRow(token, row);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("submit-lead error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
