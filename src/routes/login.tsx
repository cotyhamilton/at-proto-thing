import { Hono } from "hono";
import { type FC } from "hono/jsx";
import { isValidHandle } from "@atproto/syntax";
import { Layout } from "../components/layout.tsx";
import { client } from "../oauth/client.ts";

const app = new Hono();

const Page: FC = () => {
  return (
    <div class="flex min-h-screen items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm space-y-6">
        <div class="space-y-2 text-center">
          <h1 class="text-2xl font-semibold tracking-tight">
            Welcome
          </h1>
          <p class="text-sm text-muted-foreground">
            Sign in with your bluesky account to continue
          </p>
        </div>
        <form method="post" class="space-y-4">
          <div class="space-y-2">
            <label
              htmlFor="handle"
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Handle
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <input
                id="handle"
                name="handle"
                placeholder="alice.bsky.social"
                class="pl-10 border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            class="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-gray-300"
          >
            Sign in
          </button>
        </form>
        <div class="text-center text-sm">
          <span class="text-muted-foreground">
            Don't have an account?{" "}
            <a
              href="https://bsky.app"
              class="underline-offset-4 hover:underline text-primary"
            >
              Sign up
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};

app.get("/", (c) =>
  c.html(
    <Layout>
      <Page></Page>
    </Layout>,
  ));

app.post("/", async (c) => {
  const formData = await c.req.formData();
  const handle = formData.get("handle");

  if (typeof handle !== "string" || !isValidHandle(handle)) {
    throw new Error("Invalid handle");
  }

  const url = await client.authorize(handle as string, {
    scope: "atproto transition:generic",
  });

  return c.redirect(url.toString());
});

export default app;
