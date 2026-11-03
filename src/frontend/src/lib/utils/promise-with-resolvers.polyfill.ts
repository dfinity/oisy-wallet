/**
 * `Promise.withResolvers` polyfill for browsers that predate it
 * (e.g. Safari < 17.4).
 *
 * `@icp-sdk/signer`, which `@icp-sdk/auth` v6 uses to talk to the identity
 * provider, calls `Promise.withResolvers()` for every request. Without it,
 * sign-in fails with `TypeError: Promise.withResolvers is not a function`.
 *
 * The build `target` only transpiles syntax, it does not add missing
 * built-ins. Importing this module from shared code that runs in both the
 * main thread and Web Workers (e.g. `auth-client.providers.ts`) guarantees it
 * is installed before any `AuthClient` method is invoked.
 *
 * In browsers that support `Promise.withResolvers` natively, this module is a
 * no-op.
 */
if (typeof Promise.withResolvers !== 'function') {
	const withResolvers = <T>(): PromiseWithResolvers<T> => {
		let resolve!: PromiseWithResolvers<T>['resolve'];
		let reject!: PromiseWithResolvers<T>['reject'];

		const promise = new Promise<T>((res, rej) => {
			resolve = res;
			reject = rej;
		});

		return { promise, resolve, reject };
	};

	// Same property attributes as the native static method.
	Object.defineProperty(Promise, 'withResolvers', {
		value: withResolvers,
		configurable: true,
		writable: true
	});
}

// Mark this file as a module (it otherwise has no imports/exports and TS
// treats it as a global script, which breaks `await import()` in tests).
export {};
