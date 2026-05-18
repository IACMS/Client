/**
 * Tiny pub/sub for cross-cutting auth events emitted by the API client.
 * Decouples `apiFetch` from React state so it can signal the UI without
 * importing React or the session context (which would create a cycle).
 *
 *  - `expired`   : refresh failed; the user should be signed out.
 *  - `forbidden` : the server returned 403; UI may surface a toast.
 */

export type AuthEvent = "expired" | "forbidden";

type Listener = (event: AuthEvent) => void;

const listeners = new Set<Listener>();

export const authBus = {
  on(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit(event: AuthEvent): void {
    for (const l of listeners) {
      try {
        l(event);
      } catch {
        // listener errors must not break other subscribers
      }
    }
  },
};
