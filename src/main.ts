import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { jsxRenderer } from "hono/jsx-renderer";
import { pino } from "pino";
import { Agent } from "@atproto/api";
import routes from "./routes.ts";
import { OAuthClient } from "./oauth/oauth.ts";
import { kv } from "./kv.ts";
import { client } from "./oauth/client.ts";
import { getIronSession } from "iron-session";
import { env } from "./env.ts";

export type AppContext = {
  kv: Deno.Kv;
  logger: pino.Logger;
  oauthClient: OAuthClient;
  trace: string;
  getSessionAgent: () => Promise<Agent | null>;
};

declare module "hono" {
  interface ContextVariableMap {
    ctx: AppContext;
  }
}

export type Session = { did: string };

// gets the atproto agent for the active session
export async function getSessionAgent(
  req: Request,
  res: Response,
  ctx: AppContext,
) {
  const session = await getIronSession<Session>(req, res, {
    cookieName: "sid",
    password: env.COOKIE_SECRET,
  });

  if (!session.did) {
    return null;
  }

  try {
    const oauthSession = await ctx.oauthClient.restore(session.did);
    return oauthSession ? new Agent(oauthSession) : null;
  } catch (err) {
    ctx.logger.warn({ err }, "oauth restore failed");
    session.destroy();
    return null;
  }
}

const app = new Hono();

const logger = pino({
  level: env.LOG_LEVEL || "info",
});

// application context middleware
app.use(async (c, next) => {
  const trace = crypto.randomUUID();

  c.set("ctx", {
    kv,
    logger: logger.child({ trace }),
    oauthClient: client,
    trace,
    getSessionAgent: () => getSessionAgent(c.req.raw, c.res, c.get("ctx")),
  });

  await next();
});

// logging middleware
app.use(async (c, next) => {
  const requestStartTime = Date.now();
  const { logger } = c.get("ctx");

  logger.debug({
    method: c.req.method,
    path: c.req.path,
  }, "HTTP Request Started");

  await next();

  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${Date.now() - requestStartTime}ms`,
  }, "HTTP Request Finished");
});

app.use(jsxRenderer());

app.route("/", routes);
app.use("/static/*", serveStatic({ root: "./" }));

export default {
  fetch: app.fetch,
} satisfies Deno.ServeDefaultExport;

if (env.DEV) {
  // Store connected WebSocket clients
  const clients = new Set<WebSocket>();

  // Handle WebSocket connections for dev reload
  app.get("/dev", (c) => {
    const { logger } = c.get("ctx");

    if (c.req.raw.headers.get("upgrade") !== "websocket") {
      return c.text("Expected WebSocket connection", 400);
    }

    const { socket, response } = Deno.upgradeWebSocket(c.req.raw);

    socket.onopen = () => {
      clients.add(socket);
      logger.debug("Dev WebSocket client connected");
    };

    socket.onclose = () => {
      clients.delete(socket);
      logger.debug("Dev WebSocket client disconnected");
    };

    socket.onerror = (e) => {
      logger.error("Dev WebSocket error:", e);
      clients.delete(socket);
    };

    return response;
  });

  // Listen for HMR events and notify clients
  addEventListener("hmr", (e: Event) => {
    const event = e as CustomEvent;
    logger.debug("HMR event received:", event.detail);

    // Notify all connected clients to reload
    clients.forEach((client) => {
      try {
        client.send("reload");
      } catch (err) {
        logger.error("Failed to send reload message:", err);
        clients.delete(client);
      }
    });
  });
}
