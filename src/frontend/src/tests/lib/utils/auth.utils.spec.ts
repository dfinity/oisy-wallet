describe('auth utils', () => {
	describe('getOptionalDerivationOrigin', () => {
		let originalWindowLocation: Location;
		const derivationOrigin = 'https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io';
		const alternativeOrigins = ['https://staging.oisy.com', 'https://hello.com'];

		beforeAll(() => {
			originalWindowLocation = window.location;
		});

		afterAll(() => {
			vi.stubGlobal('location', originalWindowLocation);
		});

		describe('with alternative origins and derivation origin configured', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.stubEnv('VITE_AUTH_ALTERNATIVE_ORIGINS', alternativeOrigins.join(','));
				vi.stubEnv('VITE_AUTH_DERIVATION_ORIGIN', derivationOrigin);
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			describe.each(alternativeOrigins)('$name', (url) => {
				it('should return derivation if the origin is in the known alternative origins', async () => {
					const { getOptionalDerivationOrigin } = await import('$lib/utils/auth.utils');

					vi.stubGlobal('location', { origin: url });

					expect(getOptionalDerivationOrigin()).toEqual({
						derivationOrigin
					});
				});
			});

			it('should return empty object if the origin is not in the known alternative origins', async () => {
				const { getOptionalDerivationOrigin } = await import('$lib/utils/auth.utils');

				vi.stubGlobal('location', { origin: 'https://empty.com' });

				expect(getOptionalDerivationOrigin()).toEqual({});
			});
		});

		describe('with empty alternative origins', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.stubEnv('VITE_AUTH_ALTERNATIVE_ORIGINS', '');
				vi.stubEnv('VITE_AUTH_DERIVATION_ORIGIN', derivationOrigin);
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('should return empty object', async () => {
				const { getOptionalDerivationOrigin } = await import('$lib/utils/auth.utils');

				vi.stubGlobal('location', { origin: derivationOrigin });

				expect(getOptionalDerivationOrigin()).toEqual({});
			});
		});

		describe('with no derivation origin', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.stubEnv('VITE_AUTH_ALTERNATIVE_ORIGINS', alternativeOrigins.join(','));
				vi.stubEnv('VITE_AUTH_DERIVATION_ORIGIN', '');
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('should return empty object', async () => {
				const { getOptionalDerivationOrigin } = await import('$lib/utils/auth.utils');

				vi.stubGlobal('location', { origin: alternativeOrigins[0] });

				expect(getOptionalDerivationOrigin()).toEqual({});
			});
		});

		describe('no environment set', () => {
			it('should return empty object', async () => {
				const { getOptionalDerivationOrigin } = await import('$lib/utils/auth.utils');

				vi.stubGlobal('location', { origin: derivationOrigin });

				expect(getOptionalDerivationOrigin()).toEqual({});
			});
		});
	});
});
