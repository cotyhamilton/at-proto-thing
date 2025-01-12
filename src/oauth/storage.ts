import {
  NodeSavedSession,
  NodeSavedSessionStore,
  NodeSavedState,
  NodeSavedStateStore,
} from "./oauth.ts";

export class StateStore implements NodeSavedStateStore {
  constructor(private kv: Deno.Kv) {}

  async get(key: string): Promise<NodeSavedState | undefined> {
    const result = await this.kv.get<string>(["atproto_state", key]);

    if (!result.value) return;
    return JSON.parse(result.value) as NodeSavedState;
  }

  async set(key: string, val: NodeSavedState) {
    await this.kv.set(["atproto_state", key], JSON.stringify(val));
  }

  async del(key: string) {
    await this.kv.delete(["atprotosession", key]);
  }
}

export class SessionStore implements NodeSavedSessionStore {
  constructor(private kv: Deno.Kv) {}

  async get(key: string): Promise<NodeSavedSession | undefined> {
    const result = await this.kv.get<string>(["atproto_session", key]);

    if (!result.value) return;
    return JSON.parse(result.value) as NodeSavedSession;
  }

  async set(key: string, val: NodeSavedSession) {
    await this.kv.set(["atproto_session", key], JSON.stringify(val));
  }

  async del(key: string) {
    await this.kv.delete(["atproto_session", key]);
  }
}
