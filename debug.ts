import { kv } from "./src/kv.ts";

const entries = kv.list({ prefix: [] });

for await (const entry of entries) {
  console.log({ entry });
}
