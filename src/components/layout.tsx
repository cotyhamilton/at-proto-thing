import { html, raw } from "hono/html";

import { type FC, type PropsWithChildren } from "hono/jsx";
import { env } from "../env.ts";

export const Layout: FC<
  PropsWithChildren<{ title?: string; image?: string; description?: string }>
> = ({
  children,
  title = "Hono",
}) => {
  return html`<!doctype html>
    <html lang="en" class="h-full bg-white dark:bg-zinc-950 dark:text-white">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="https://fav.farm/🔥" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link rel="stylesheet" href="/static/style.css">
      </head>
      <body>
        <div class="container mx-auto">
          ${children}
        </div>
      </body>
      ${
    env.DEV
      ? html`<script type="text/javascript">
          ${
        raw(Deno.readTextFileSync(import.meta.dirname + "/../client/dev.js"))
      }
        </script>`
      : undefined
  }
    </html>`;
};
