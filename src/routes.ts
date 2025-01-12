import { Hono } from "hono";
import index from "./routes/index.tsx";
import login from "./routes/login.tsx";
import logout from "./routes/logout.ts";
import oauth from "./routes/oauth.ts";
import clientMeta from "./routes/client-metadata.ts";

const app = new Hono();

app.route("/", index);
app.route("/login", login);
app.route("/logout", logout);
app.route("/oauth", oauth);
app.route("/client-metadata.json", clientMeta);

export default app;
