/**
 * Cart session: Cart-Token first, Nonce fallback.
 * No consumer keys / OAuth — Store API only.
 */

export interface SessionSnapshot {
  cartToken: string | null;
  nonce: string | null;
}

export interface SessionStore {
  get(): Promise<SessionSnapshot> | SessionSnapshot;
  set(snapshot: SessionSnapshot): Promise<void> | void;
}

/** In-memory session (default for Node / short-lived clients). */
export class MemorySessionStore implements SessionStore {
  private cartToken: string | null = null;
  private nonce: string | null = null;

  constructor(initial?: Partial<SessionSnapshot>) {
    if (initial?.cartToken) this.cartToken = initial.cartToken;
    if (initial?.nonce) this.nonce = initial.nonce;
  }

  get(): SessionSnapshot {
    return { cartToken: this.cartToken, nonce: this.nonce };
  }

  set(snapshot: SessionSnapshot): void {
    this.cartToken = snapshot.cartToken;
    this.nonce = snapshot.nonce;
  }
}

function headerValue(
  headers: Record<string, unknown> | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  const target = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== target) continue;
    if (v == null) return null;
    if (Array.isArray(v)) return v[0] != null ? String(v[0]) : null;
    return String(v);
  }
  return null;
}

/**
 * Owns cart session headers for Store API requests.
 * Prefer Cart-Token (nonce not required when present).
 */
export class CartSession {
  private readonly store: SessionStore;

  constructor(store: SessionStore) {
    this.store = store;
  }

  async getSnapshot(): Promise<SessionSnapshot> {
    return this.store.get();
  }

  async getCartToken(): Promise<string | null> {
    return (await this.getSnapshot()).cartToken;
  }

  async getNonce(): Promise<string | null> {
    return (await this.getSnapshot()).nonce;
  }

  /**
   * Headers for the next request.
   * Cart-Token wins; otherwise Nonce if available.
   */
  async getRequestHeaders(): Promise<Record<string, string>> {
    const { cartToken, nonce } = await this.getSnapshot();
    const headers: Record<string, string> = {};
    if (cartToken) {
      headers["Cart-Token"] = cartToken;
    } else if (nonce) {
      headers["Nonce"] = nonce;
    }
    return headers;
  }

  /**
   * Absorb Cart-Token / Nonce from response headers (case-insensitive).
   */
  async absorbResponseHeaders(
    headers: Record<string, unknown> | undefined,
  ): Promise<SessionSnapshot> {
    const current = await this.getSnapshot();
    const cartToken =
      headerValue(headers, "cart-token") ??
      headerValue(headers, "Cart-Token") ??
      current.cartToken;
    const nonce =
      headerValue(headers, "nonce") ??
      headerValue(headers, "Nonce") ??
      current.nonce;

    const next: SessionSnapshot = {
      cartToken: cartToken || null,
      nonce: nonce || null,
    };
    await this.store.set(next);
    return next;
  }

  async setCartToken(token: string | null): Promise<void> {
    const current = await this.getSnapshot();
    await this.store.set({ ...current, cartToken: token });
  }

  async clear(): Promise<void> {
    await this.store.set({ cartToken: null, nonce: null });
  }
}
