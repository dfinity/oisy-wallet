describe('promise-with-resolvers.polyfill', () => {
	// We need to re-evaluate the module from scratch for each scenario, because
	// the polyfill installs itself at import time. `vi.resetModules()` drops
	// the cached module so `await import(...)` runs the top-level code again.
	const importPolyfill = async (): Promise<void> => {
		vi.resetModules();
		await import('$lib/utils/promise-with-resolvers.polyfill');
	};

	const originalWithResolversDescriptor = Object.getOwnPropertyDescriptor(Promise, 'withResolvers');

	const removeWithResolvers = (): void => {
		Reflect.deleteProperty(Promise, 'withResolvers');
	};

	const restoreWithResolvers = (): void => {
		if (originalWithResolversDescriptor === undefined) {
			Reflect.deleteProperty(Promise, 'withResolvers');
			return;
		}

		Object.defineProperty(Promise, 'withResolvers', originalWithResolversDescriptor);
	};

	afterEach(() => {
		restoreWithResolvers();
		vi.resetModules();
	});

	describe('when `Promise.withResolvers` is missing (e.g. Safari < 17.4)', () => {
		beforeEach(() => {
			removeWithResolvers();
		});

		it('should install `Promise.withResolvers`', async () => {
			expect(Promise.withResolvers).toBeUndefined();

			await importPolyfill();

			expect(typeof Promise.withResolvers).toBe('function');
		});

		it('should install it with the same property attributes as the native method', async () => {
			await importPolyfill();

			const descriptor = Object.getOwnPropertyDescriptor(Promise, 'withResolvers');

			expect(descriptor?.enumerable).toBeFalsy();
			expect(descriptor?.configurable).toBeTruthy();
			expect(descriptor?.writable).toBeTruthy();
		});

		it('should resolve the promise with `resolve`', async () => {
			await importPolyfill();

			const { promise, resolve } = Promise.withResolvers<string>();

			resolve('value');

			await expect(promise).resolves.toBe('value');
		});

		it('should reject the promise with `reject`', async () => {
			await importPolyfill();

			const { promise, reject } = Promise.withResolvers<string>();

			const error = new Error('rejected');
			reject(error);

			await expect(promise).rejects.toThrow(error);
		});

		it('should return a new promise on every call', async () => {
			await importPolyfill();

			const first = Promise.withResolvers<void>();
			const second = Promise.withResolvers<void>();

			expect(first.promise).toBeInstanceOf(Promise);
			expect(first.promise).not.toBe(second.promise);
		});
	});

	describe('when `Promise.withResolvers` is supported natively', () => {
		it('should not replace the native implementation', async () => {
			const native = vi.fn();

			Object.defineProperty(Promise, 'withResolvers', {
				value: native,
				configurable: true,
				writable: true
			});

			await importPolyfill();

			expect(Promise.withResolvers).toBe(native);
		});
	});
});
