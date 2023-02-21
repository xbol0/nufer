import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const Default_upstream = Deno.env.get("UPSTREAM") || "relay.damus.io";
const Keywords = new Set((Deno.env.get("KEYWORDS") || "").split(/\s+/));

function handleWebsocket(ws: WebSocket, upstream: WebSocket) {
  ws.addEventListener("error", (e) => {
    console.error(e);
    ws.close();
    upstream.close();
  });

  ws.addEventListener("close", () => upstream.close());

  ws.addEventListener("message", (e) => {
    // TODO: should block this event to upstream?

    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(e.data);
    } else {
      ws.close();
    }
  });
}

function connect(url: string, source: WebSocket): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://${url}`);
    ws.addEventListener("error", (err) => {
      console.error(err);
      ws.close();
      source.close();
      reject(err);
    });
    ws.addEventListener("close", () => source.close());
    ws.addEventListener("open", () => resolve(ws));

    ws.addEventListener("message", (e) => {
      let json;

      try {
        json = JSON.parse(e.data);

        if (!(json instanceof Array)) throw new Error("Invalid nostr format");
      } catch {
        return;
      }

      if (json[0] !== "EVENT") {
        source.send(e.data);
      } else {
        const event = json[2];
        if (event.kind !== 1) {
          source.send(e.data);
          return;
        }

        for (const key of Keywords) {
          if (event.content.includes(key)) return;
        }

        source.send(e.data);
      }
    });
  });
}

function start() {
  console.log(`initialize with ${Keywords.size} keywords`);

  serve(async (req) => {
    console.log(req.method, req.url);

    const url = new URL(req.url);
    const upstream = url.pathname.slice(1) || Default_upstream;

    if (
      req.method === "GET" &&
      req.headers.get("accept") === "application/nostr+json"
    ) {
      return fetch(`https://${upstream}`, { headers: req.headers });
    }

    if (!req.headers.has("upgrade")) {
      return new Response("Please connect with a nostr client.", {
        headers: { "content-type": "text/plain" },
      });
    }

    const res = Deno.upgradeWebSocket(req);

    try {
      const up = await connect(upstream, res.socket);
      handleWebsocket(res.socket, up);
      console.log(`new client redirect to ${upstream}`);
    } catch (err) {
      console.error(err);
      return new Response(null, { status: 400 });
    }

    return res.response;
  }, { port: parseInt(Deno.env.get("PORT") || "9000") });
}

if (import.meta.main) start();
