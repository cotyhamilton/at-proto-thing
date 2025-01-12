import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json(c.get("ctx").oauthClient.clientMetadata);
});

export default app;
