export const onRequest = async (context) => {
  const url = new URL(context.request.url);
  const token = url.pathname.split("/")[1];

  // Homepage (no token)
  if (!token) {
    return new Response("<h1>Temporary Access System. To generate a link, visit the Generator Worker.</h1>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  }

  // Look up token in KV
  const record = await context.env.TEMP_LINKS.get(token, { type: "json" });

  if (!record) {
    return new Response("Invalid or expired link.", { status: 404 });
  }

  // Check expiration
  if (Date.now() > record.expires) {
    // Optional: Delete expired key to clean up storage
    context.env.TEMP_LINKS.delete(token); 
    return new Response("Link expired.", { status: 410 });
  }

  // Proxy the request to ngrok
  // This constructs the full target URL correctly:
  const targetUrl = record.target + url.pathname.replace(`/${token}`, "") + url.search;

  // IMPORTANT: The fetch must use the real headers to pass through all data
  return fetch(targetUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
    redirect: 'follow',
  });
};