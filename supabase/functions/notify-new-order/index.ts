import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** base64url encode (Google OAuth2 requires base64url, NOT standard base64) */
function base64url(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let b64 = btoa(String.fromCharCode(...bytes));
  // Convert standard base64 → base64url
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── FCM v1 via Google Service Account JWT ────────────────────────────────────
const SERVICE_ACCOUNT = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "{}");
const PROJECT_ID: string = SERVICE_ACCOUNT.project_id ?? "";

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const toSign = `${header}.${payload}`;

  // Import RSA private key
  const pemBody = SERVICE_ACCOUNT.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "")
    .trim();

  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(toSign)
  );

  // Signature must also be base64url encoded
  const sig = base64url(new Uint8Array(sigBytes));
  const jwt = `${toSign}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("Failed to get FCM access token:", JSON.stringify(tokenData));
    throw new Error(`FCM token error: ${tokenData.error_description ?? JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function sendFcmPush(
  token: string,
  title: string,
  body: string,
  accessToken: string
) {
  const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channel_id: "new_orders",
          },
        },
      },
    }),
  });
  const result = await res.json();
  console.log("FCM send result:", JSON.stringify(result));
  return result;
}

// ─── Edge Function Handler ────────────────────────────────────────────────────
serve(async (req) => {
  try {
    const payload = await req.json();
    const newOrder = payload.record ?? payload.new ?? payload;

    console.log("New order received:", newOrder.order_number);

    const title = "New Order! 🎉";
    const body = `Order #${newOrder.order_number} — ${newOrder.first_name} ${newOrder.last_name}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: devices, error } = await supabase
      .from("admin_devices")
      .select("fcm_token");

    if (error) {
      console.error("DB error:", error.message);
      throw error;
    }

    console.log(`Found ${devices?.length ?? 0} registered devices`);

    if (!devices || devices.length === 0) {
      return new Response(JSON.stringify({ message: "No devices registered" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    console.log("Got FCM access token successfully");

    const results = await Promise.allSettled(
      devices.map((d) => sendFcmPush(d.fcm_token, title, body, accessToken))
    );

    return new Response(JSON.stringify({ sent: devices.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-new-order error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
