/**
 * Ripped from
 *
 * https://github.com/callmephilip/tinychat-at-proto/blob/main/tinychat/oauth.ts
 *
 * until @atproto/oauth-client-node works on Deno
 */

import { JwtVerifyError } from "@atproto/jwk";
import {
  errors,
  exportJWK,
  generateKeyPair,
  type GenerateKeyPairOptions,
  type GenerateKeyPairResult,
  importJWK,
  importPKCS8,
  type JWK,
  jwtVerify,
  type JWTVerifyOptions,
  type KeyLike,
  SignJWT,
} from "npm:jose";

import {
  Jwk,
  JwkError,
  jwkValidator,
  JwtCreateError,
  JwtHeader,
  JwtPayload,
  Key,
  SignedJwt,
  VerifyOptions,
  VerifyPayload,
  VerifyResult,
} from "@atproto/jwk";

import { SimpleStore } from "@atproto-labs/simple-store";
import { InternalStateData, Session } from "@atproto/oauth-client";

export function either<T extends string | number | boolean>(
  a?: T,
  b?: T,
): T | undefined {
  if (a != null && b != null && a !== b) {
    throw new TypeError(`Expected "${b}", got "${a}"`);
  }
  return a ?? b ?? undefined;
}

const { JOSEError } = errors;

export type Importable = string | KeyLike | Jwk;

export type { GenerateKeyPairOptions, GenerateKeyPairResult };

export class JoseKey extends Key {
  #keyObj?: KeyLike | Uint8Array;

  protected async getKey() {
    try {
      // @ts-ignore readonly
      this.jwk.key_ops = ["sign"];
      // @ts-ignore readonly
      this.jwk.ext = true;
      return (this.#keyObj ||= await importJWK(this.jwk as JWK, "ES256"));
    } catch (cause) {
      throw new JwkError("Failed to import JWK", undefined, { cause });
    }
  }

  async createJwt(header: JwtHeader, payload: JwtPayload) {
    if (header.kid && header.kid !== this.kid) {
      throw new JwtCreateError(
        `Invalid "kid" (${header.kid}) used to sign with key "${this.kid}"`,
      );
    }

    if (!header.alg || !this.algorithms.includes(header.alg)) {
      throw new JwtCreateError(
        `Invalid "alg" (${header.alg}) used to sign with key "${this.kid}"`,
      );
    }

    const keyObj = await this.getKey();
    return new SignJWT(payload)
      .setProtectedHeader({ ...header, kid: this.kid })
      .sign(keyObj) as Promise<SignedJwt>;
  }

  async verifyJwt<
    P extends VerifyPayload = JwtPayload,
    C extends string = string,
  >(token: SignedJwt, options?: VerifyOptions<C>): Promise<VerifyResult<P, C>> {
    try {
      const keyObj = await this.getKey();
      const result = await jwtVerify(token, keyObj, {
        ...options,
        algorithms: this.algorithms,
      } as JWTVerifyOptions);

      return result as VerifyResult<P, C>;
    } catch (error) {
      if (error instanceof JOSEError) {
        throw new JwtVerifyError(error.message, error.code, { cause: error });
      } else {
        throw JwtVerifyError.from(error);
      }
    }
  }

  static async generateKeyPair(
    allowedAlgos: readonly string[] = ["ES256"],
    options?: GenerateKeyPairOptions,
  ) {
    if (!allowedAlgos.length) {
      throw new JwkError("No algorithms provided for key generation");
    }

    const errors: unknown[] = [];
    for (const alg of allowedAlgos) {
      try {
        return await generateKeyPair(alg, options);
      } catch (err) {
        errors.push(err);
      }
    }

    throw new JwkError("Failed to generate key pair", undefined, {
      cause: new AggregateError(errors, "None of the algorithms worked"),
    });
  }

  static async generate(
    allowedAlgos: string[] = ["ES256"],
    kid?: string,
    options?: Omit<GenerateKeyPairOptions, "extractable">,
  ) {
    const kp = await this.generateKeyPair(allowedAlgos, {
      ...options,
      extractable: true,
    });
    return this.fromImportable(kp.privateKey, kid);
  }

  static async fromImportable(
    input: Importable,
    kid?: string,
  ): Promise<JoseKey> {
    if (typeof input === "string") {
      // PKCS8
      if (input.startsWith("-----")) {
        // The "alg" is only needed in WebCrypto (NodeJS will be fine)
        return await this.fromPKCS8(input, "", kid);
      }

      // Jwk (string)
      if (input.startsWith("{")) {
        return this.fromJWK(input, kid);
      }

      throw new JwkError("Invalid input");
    }

    if (typeof input === "object") {
      // Jwk
      if ("kty" in input || "alg" in input) {
        return this.fromJWK(input, kid);
      }

      // KeyLike
      return this.fromKeyLike(input, kid);
    }

    throw new JwkError("Invalid input");
  }

  /**
   * @see {@link exportJWK}
   */
  static async fromKeyLike(
    keyLike: KeyLike | Uint8Array,
    kid?: string,
    alg?: string,
  ): Promise<JoseKey> {
    const jwk = await exportJWK(keyLike);
    if (alg) {
      if (!jwk.alg) jwk.alg = alg;
      else if (jwk.alg !== alg) throw new JwkError('Invalid "alg" in JWK');
    }
    // @ts-ignore cannot convert JWK to string
    return this.fromJWK(jwk, kid);
  }

  /**
   * @see {@link importPKCS8}
   */
  static async fromPKCS8(
    pem: string,
    alg: string,
    kid?: string,
  ): Promise<JoseKey> {
    const keyLike = await importPKCS8(pem, alg, { extractable: true });
    return this.fromKeyLike(keyLike, kid);
  }

  static fromJWK(
    input: string | Record<string, unknown>,
    inputKid?: string,
  ): JoseKey {
    const jwk = typeof input === "string" ? JSON.parse(input) : input;
    if (!jwk || typeof jwk !== "object") throw new JwkError("Invalid JWK");

    const kid = either(jwk.kid, inputKid);
    const use = jwk.use || "sig";

    return new JoseKey(jwkValidator.parse({ ...jwk, kid, use }));
  }
}
type ToDpopJwkValue<V extends { dpopKey: Key }> = Omit<V, "dpopKey"> & {
  dpopJwk: Jwk;
};

/**
 * Utility function that allows to simplify the store interface by exposing a
 * JWK (JSON) instead of a Key instance.
 */
export function toDpopKeyStore<K extends string, V extends { dpopKey: Key }>(
  store: SimpleStore<K, ToDpopJwkValue<V>>,
): SimpleStore<K, V> {
  return {
    async set(sub: K, { dpopKey, ...data }: V) {
      const dpopJwk = dpopKey.privateJwk;
      if (!dpopJwk) throw new Error("Private DPoP JWK is missing.");

      await store.set(sub, { ...data, dpopJwk });
    },

    async get(sub: K) {
      const result = await store.get(sub);
      if (!result) return undefined;

      const { dpopJwk, ...data } = result;
      const dpopKey = await JoseKey.fromJWK(dpopJwk);
      return { ...data, dpopKey } as unknown as V;
    },

    del: store.del.bind(store),
    clear: store.clear?.bind(store),
  };
}

export type NodeSavedState = ToDpopJwkValue<InternalStateData>;
export type NodeSavedStateStore = SimpleStore<string, NodeSavedState>;

export type NodeSavedSession = ToDpopJwkValue<Session>;
export type NodeSavedSessionStore = SimpleStore<string, NodeSavedSession>;

export { OAuthClient } from "@atproto/oauth-client";
