import { env } from "./env.ts";

export const kv = await Deno.openKv(env.KV_PATH);
