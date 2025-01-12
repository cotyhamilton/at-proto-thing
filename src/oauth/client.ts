import { createHash, randomBytes } from "node:crypto";
import { JoseKey, OAuthClient, toDpopKeyStore } from "./oauth.ts";
import { kv } from "../kv.ts";
import { SessionStore, StateStore } from "./storage.ts";
import { env } from "../env.ts";

export const createClient = (db: Deno.Kv) => {
  const publicUrl = env.PUBLIC_URL;
  const url = publicUrl || `http://127.0.0.1:${env.PORT || 8000}`;
  const enc = encodeURIComponent;

  return new OAuthClient({
    handleResolver: "https://api.bsky.app",
    responseMode: "query",
    clientMetadata: {
      client_name: "AT Protocol Deno",
      client_id: publicUrl
        ? `${url}/client-metadata.json`
        : `http://localhost?redirect_uri=${
          enc(`${url}/oauth/callback`)
        }&scope=${enc("atproto transition:generic")}`,
      client_uri: url,
      redirect_uris: [`${url}/oauth/callback`],
      scope: "atproto transition:generic",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },

    stateStore: toDpopKeyStore(new StateStore(db)),
    sessionStore: toDpopKeyStore(new SessionStore(db)),

    runtimeImplementation: {
      createKey(algs: string[]) {
        return JoseKey.generate(algs);
      },
      getRandomValues: randomBytes,
      digest(bytes: Uint8Array, algorithm: { name: string }) {
        return createHash(algorithm.name).update(bytes).digest();
      },
    },
  });
};

export const client = createClient(kv);
