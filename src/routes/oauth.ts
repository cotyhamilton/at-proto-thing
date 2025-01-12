import { Hono } from "hono";
import { getIronSession } from "iron-session";
import { Session } from "../main.ts";
import { env } from "../env.ts";
import assert from "node:assert";

const app = new Hono();

app.get("/callback", async (c) => {
  const params = new URLSearchParams(c.req.url.split("?")[1]);
  try {
    const { session } = await c.get("ctx").oauthClient.callback(params);

    const clientSession = await getIronSession<Session>(c.req.raw, c.res, {
      cookieName: "sid",
      password: env.COOKIE_SECRET,
      cookieOptions: {
        secure: !env.DEV,
      },
    });

    assert(!clientSession.did, "session already exists");
    clientSession.did = session.did;
    await clientSession.save();

    return c.redirect("/");
  } catch (err) {
    c.get("ctx").logger.error({ err }, "oauth callback failed");
    return c.redirect("/");
  }
});

export default app;
