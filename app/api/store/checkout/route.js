import { NextResponse } from "next/server";

// Compatibility endpoint: forward to canonical /api/orders flow.
// This keeps old mobile clients working while ensuring one source of truth.
export async function POST(request) {
  try {
    const body = await request.text();
    const targetUrl = new URL("/api/orders", request.url);

    const passthroughHeaders = {
      "content-type": "application/json",
    };

    const authHeader = request.headers.get("authorization");
    if (authHeader) passthroughHeaders.authorization = authHeader;

    const forwardedHeaderKeys = [
      "x-order-source",
      "x-client-platform",
      "x-app-platform",
      "x-mobile-platform",
      "x-platform",
      "x-app-source",
      "x-app-id",
      "x-device-type",
      "x-mobile-app",
      "x-client",
      "user-agent",
    ];

    for (const key of forwardedHeaderKeys) {
      const value = request.headers.get(key);
      if (value) passthroughHeaders[key] = value;
    }

    const response = await fetch(targetUrl.toString(), {
      method: "POST",
      headers: passthroughHeaders,
      body,
    });

    const responseText = await response.text();
    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { error: responseText || "Order request failed" };
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("[store/checkout] Proxy error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to place order" },
      { status: 500 }
    );
  }
}
