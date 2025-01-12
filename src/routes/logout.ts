import { Hono } from "hono";
import { Session } from "../main.ts";
import { env } from "../env.ts";
import { getIronSession } from "iron-session";

const app = new Hono();

app.get("/", async (c) => {
  const session = await getIronSession<Session>(c.req.raw, c.res, {
    cookieName: "sid",
    password: env.COOKIE_SECRET,
    cookieOptions: {
      secure: !env.DEV,
    },
  });
  session.destroy();
  return c.redirect("/");
});

export default app;
