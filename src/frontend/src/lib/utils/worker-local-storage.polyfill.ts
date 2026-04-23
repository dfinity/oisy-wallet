/**
 * In-memory `localStorage` polyfill for Web Workers.
 *
 * `@icp-sdk/auth` v6 reaches into `localStorage` from several code paths
 * (notably `AuthClient.isAuthenticated()`, `persistChain`, `deleteStorage`
 * via `restoreChain`, and `logout`). Web Workers don't expose a
 * `localStorage` global, so any such call crashes with
 * `ReferenceError: localStorage is not defined`.
 *
 * We install a tiny in-memory `Storage`-compatible shim on `globalThis`
 * so those paths don't throw inside workers. The shim is local to the
 * worker scope and intentionally does not attempt to persist anything —
 * the source of truth remains IndexedDB, which `AuthClient` uses via
 * `IdbStorage`.
 *
 * In the main thread `localStorage` already exists, so this module is a
 * no-op. Importing it from shared code that runs in both contexts
 * (e.g. `auth-client.providers.ts`) guarantees it is installed before
 * any `AuthClient` method is invoked.
 */
if (typeof globalThis.localStorage === 'undefined') {
	const store = new Map<string, string>();

	// Mirrors the DOM `Storage` interface signatures exactly so callers behave
	// the same as in the main thread. The multi-arg `setItem` is intentional
	// and dictated by that interface, hence the local-rules exemption.
	/* eslint-disable local-rules/prefer-object-params */
	const polyfill: Storage = {
		getItem: (key: string): string | null => store.get(key) ?? null,
		setItem: (key: string, value: string): void => {
			store.set(key, String(value));
		},
		removeItem: (key: string): void => {
			store.delete(key);
		},
		clear: (): void => {
			store.clear();
		},
		key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
		get length(): number {
			return store.size;
		}
	};
	/* eslint-enable local-rules/prefer-object-params */

	Object.defineProperty(globalThis, 'localStorage', {
		value: polyfill,
		configurable: true,
		writable: false
	});
}
