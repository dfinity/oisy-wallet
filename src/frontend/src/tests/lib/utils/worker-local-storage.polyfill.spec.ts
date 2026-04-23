describe('worker-local-storage.polyfill', () => {
	// We need to re-evaluate the module from scratch for each scenario, because
	// the polyfill installs itself at import time. `vi.resetModules()` drops
	// the cached module so `await import(...)` runs the top-level code again.
	const importPolyfill = async (): Promise<void> => {
		vi.resetModules();
		await import('$lib/utils/worker-local-storage.polyfill');
	};

	const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
		globalThis,
		'localStorage'
	);

	const removeLocalStorage = (): void => {
		Object.defineProperty(globalThis, 'localStorage', {
			value: undefined,
			configurable: true,
			writable: true
		});
	};

	const restoreLocalStorage = (): void => {
		if (originalLocalStorageDescriptor === undefined) {
			Reflect.deleteProperty(globalThis, 'localStorage');
			return;
		}

		Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor);
	};

	afterEach(() => {
		restoreLocalStorage();
		vi.resetModules();
	});

	describe('when `localStorage` is undefined (Web Worker scope)', () => {
		beforeEach(() => {
			removeLocalStorage();
		});

		it('should install a Storage-compatible shim on `globalThis`', async () => {
			await importPolyfill();

			expect(globalThis.localStorage).toBeDefined();
			expect(typeof globalThis.localStorage.getItem).toBe('function');
			expect(typeof globalThis.localStorage.setItem).toBe('function');
			expect(typeof globalThis.localStorage.removeItem).toBe('function');
			expect(typeof globalThis.localStorage.clear).toBe('function');
			expect(typeof globalThis.localStorage.key).toBe('function');
			expect(typeof globalThis.localStorage.length).toBe('number');
		});

		it('should round-trip `setItem` / `getItem`', async () => {
			await importPolyfill();

			globalThis.localStorage.setItem('k', 'v');

			expect(globalThis.localStorage.getItem('k')).toBe('v');
		});

		it('should return `null` for missing keys', async () => {
			await importPolyfill();

			expect(globalThis.localStorage.getItem('missing')).toBeNull();
		});

		it('should coerce non-string values to strings on `setItem`', async () => {
			await importPolyfill();

			// The DOM `Storage` interface is typed as `string` but stores stringified
			// values at runtime; the shim mirrors that behaviour.
			globalThis.localStorage.setItem('num', 42 as unknown as string);

			expect(globalThis.localStorage.getItem('num')).toBe('42');
		});

		it('should remove entries with `removeItem`', async () => {
			await importPolyfill();

			globalThis.localStorage.setItem('k', 'v');
			globalThis.localStorage.removeItem('k');

			expect(globalThis.localStorage.getItem('k')).toBeNull();
		});

		it('should be a no-op to `removeItem` a missing key', async () => {
			await importPolyfill();

			expect(() => globalThis.localStorage.removeItem('missing')).not.toThrow();
		});

		it('should clear all entries with `clear`', async () => {
			await importPolyfill();

			globalThis.localStorage.setItem('a', '1');
			globalThis.localStorage.setItem('b', '2');
			globalThis.localStorage.clear();

			expect(globalThis.localStorage).toHaveLength(0);
			expect(globalThis.localStorage.getItem('a')).toBeNull();
			expect(globalThis.localStorage.getItem('b')).toBeNull();
		});

		it('should expose entries via `length` and `key`', async () => {
			await importPolyfill();

			globalThis.localStorage.setItem('a', '1');
			globalThis.localStorage.setItem('b', '2');

			expect(globalThis.localStorage).toHaveLength(2);
			expect(globalThis.localStorage.key(0)).toBe('a');
			expect(globalThis.localStorage.key(1)).toBe('b');
			expect(globalThis.localStorage.key(999)).toBeNull();
		});
	});

	describe('when `localStorage` is already defined (main thread)', () => {
		it('should not replace the existing `localStorage`', async () => {
			const existing: Storage = {
				getItem: vi.fn().mockReturnValue('from-main'),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn(),
				key: vi.fn().mockReturnValue(null),
				length: 0
			};

			Object.defineProperty(globalThis, 'localStorage', {
				value: existing,
				configurable: true,
				writable: true
			});

			await importPolyfill();

			expect(globalThis.localStorage).toBe(existing);
			expect(globalThis.localStorage.getItem('anything')).toBe('from-main');
		});
	});
});
