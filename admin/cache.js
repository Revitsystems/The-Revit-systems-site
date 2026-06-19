/* ============================================
   CACHE.JS — In-memory request cache
   Depends on: nothing. Load before api.js.

   Design:
   - Each entry: { data, expiresAt }
   - Keys are namespaced strings, e.g. "posts:all:1" or "categories"
   - invalidate(namespace) wipes every key that starts with that prefix
   - TTLs per namespace defined in CACHE_TTL (milliseconds)
   - All API.get* calls check the cache first and only hit the network
     on a miss or expiry. Mutations call Cache.invalidate() on the
     relevant namespace so the next read goes to the network.
   ============================================ */

const CACHE_TTL = {
  posts:         2 * 60 * 1000,  // 2 min — posts change moderately
  postStats:     2 * 60 * 1000,  // 2 min
  categories:    5 * 60 * 1000,  // 5 min — categories change rarely
  comments:      1 * 60 * 1000,  // 1 min — moderation queue is time-sensitive
  users:         2 * 60 * 1000,  // 2 min
  notifications: 1 * 60 * 1000,  // 1 min
  currentUser:  10 * 60 * 1000,  // 10 min — rarely changes mid-session
};

const Cache = (() => {
  // Private store: Map<key, { data, expiresAt }>
  const _store = new Map();

  // ─── read ──────────────────────────────────────────────────────────────────
  // Returns the cached value if it exists and hasn't expired, else null.
  const get = (key) => {
    const entry = _store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      _store.delete(key);
      return null;
    }
    return entry.data;
  };

  // ─── write ─────────────────────────────────────────────────────────────────
  // namespace: one of the keys in CACHE_TTL, used to look up the TTL.
  const set = (key, data, namespace) => {
    const ttl = CACHE_TTL[namespace] ?? 2 * 60 * 1000; // default 2 min
    _store.set(key, { data, expiresAt: Date.now() + ttl });
  };

  // ─── invalidate ────────────────────────────────────────────────────────────
  // Wipes every key whose string starts with `prefix`.
  // e.g. Cache.invalidate("posts") clears "posts:all:1", "posts:draft:2", etc.
  const invalidate = (prefix) => {
    for (const key of _store.keys()) {
      if (key.startsWith(prefix)) {
        _store.delete(key);
      }
    }
  };

  // ─── invalidate multiple ───────────────────────────────────────────────────
  const invalidateMany = (...prefixes) => {
    prefixes.forEach(invalidate);
  };

  // ─── clear everything ──────────────────────────────────────────────────────
  // Used by the logout flow.
  const clear = () => _store.clear();

  // ─── debug helper ──────────────────────────────────────────────────────────
  // Cache.debug() in the console shows all live keys and their remaining TTL.
  const debug = () => {
    const now = Date.now();
    const entries = [];
    for (const [key, { expiresAt }] of _store.entries()) {
      const remaining = Math.round((expiresAt - now) / 1000);
      entries.push({ key, remainingSecs: remaining });
    }
    console.table(entries);
  };

  return { get, set, invalidate, invalidateMany, clear, debug };
})();
