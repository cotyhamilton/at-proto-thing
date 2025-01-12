import { Hono } from "hono";
import { type FC } from "hono/jsx";
import { Layout } from "../components/layout.tsx";

const app = new Hono();

const Page: FC = (props) => {
  const { data } = props;
  return (
    <>
      <div class="absolute top-4 right-4">
        <a
          href="/logout"
          class="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-gray-300"
        >
          Logout
        </a>
      </div>
      <div class="flex flex-col min-h-screen space-y-4">
        <img
          class="rounded-full"
          src={data.avatar}
          alt="profile image"
          height="168"
          width="168"
        />
        <h1 class="text-3xl font-bold">{data.displayName}</h1>
        <p>
          <span class="text-xl">@{data.handle}</span>{" "}
          <span class="font-mono bg-muted p-1 rounded">{data.did}</span>
        </p>
        <hr />
        <p class="whitespace-pre-wrap">{data.description}</p>
        <hr />
        <details>
          <div class="overflow-x-scroll bg-muted p-1">
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </details>
      </div>
    </>
  );
};

app.get("/", async (c) => {
  const agent = await c.get("ctx").getSessionAgent();

  if (!agent) {
    return c.redirect("login");
  }

  const profile = await agent.getProfile({ actor: agent.did! });
  const data = profile.data;

  return c.html(
    <Layout>
      <Page data={data}></Page>
    </Layout>,
  );
});

export default app;
