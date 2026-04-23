const NOTION_API_BASE = "https://api.notion.com/v1/pages";
const NOTION_VERSION = "2022-06-28";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, payload) {
  setCorsHeaders(res);
  res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { message: "Only POST is allowed." });
    return;
  }

  let payload = {};

  try {
    payload =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});
  } catch (error) {
    sendJson(res, 400, {
      message: "Request body must be valid JSON.",
      detail: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  const notionKey = payload?.notionKey || process.env.NOTION_API_KEY;
  const body = payload?.body;

  if (!notionKey) {
    sendJson(res, 400, {
      message: "Missing notionKey. You can pass it in the request body or set NOTION_API_KEY in Vercel environment variables."
    });
    return;
  }

  if (!body || typeof body !== "object") {
    sendJson(res, 400, { message: "Missing request body for Notion page creation." });
    return;
  }

  try {
    const notionRes = await fetch(NOTION_API_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionKey}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION
      },
      body: JSON.stringify(body)
    });

    const text = await notionRes.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!notionRes.ok) {
      const message =
        data?.message ||
        `Notion API returned ${notionRes.status}`;

      sendJson(res, notionRes.status, {
        message,
        status: notionRes.status,
        notion: data
      });
      return;
    }

    sendJson(res, 200, data || { ok: true });
  } catch (error) {
    sendJson(res, 500, {
      message: "Failed to connect to Notion API.",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
};
