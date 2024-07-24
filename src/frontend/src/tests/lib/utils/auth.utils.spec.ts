import { afterAll, describe } from 'vitest';

describe('auth utils', () => {
	describe('isAlternativeOrigin', () => {
		let originalWindowLocation: Location;

		beforeAll(() => {
			originalWindowLocation = window.location;
		});

		afterAll(() => {
			vi.stubGlobal('location', originalWindowLocation);
		});

		describe('env configured', () => {
			beforeEach(() => {
				vi.stubEnv('VITE_AUTH_ALTERNATIVE_ORIGINS', 'https://staging.oisy.com,https://hello.com');
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			const urls = [
				{
					name: 'staging',
					url: 'https://staging.oisy.com'
				},
				{
					name: 'test',
					url: 'https://hello.com'
				}
			];

			describe.each(urls)('$name', ({ url }) => {
				it('should return true if the origin is in the known alternative origins', async () => {
					const { isAlternativeOrigin } = await import('$lib/utils/auth.utils');

					vi.stubGlobal('location', { origin: url });
					expect(isAlternativeOrigin()).toBe(true);
				});
			});

			it('should return false if the origin is not in the known alternative origins', async () => {
				vi.stubGlobal('location', { origin: 'https://empty.com' });
				const { isAlternativeOrigin } = await import('$lib/utils/auth.utils');
				expect(isAlternativeOrigin()).toBe(false);
			});
		});

		describe('env configured with empty', () => {
			beforeEach(() => {
				vi.stubEnv('VITE_AUTH_ALTERNATIVE_ORIGINS', '');
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('should return false if there are no alternative origins', async () => {
				const { isAlternativeOrigin } = await import('$lib/utils/auth.utils');
				expect(isAlternativeOrigin()).toBe(false);
			});
		});

		describe('env not configured', () => {
			it('should return false if there are no alternative origins', async () => {
				const { isAlternativeOrigin } = await import('$lib/utils/auth.utils');
				expect(isAlternativeOrigin()).toBe(false);
			});
		});
	});

	describe('hasDerivationOrigin', () => {
		describe('env configured', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.stubEnv('VITE_AUTH_DERIVATION_ORIGIN', 'https://tewsx-xaaaa-aaaad-aadia-cai.icp0.io');
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('should return true if the derivation origin is not empty', async () => {
				const { hasDerivationOrigin } = await import('$lib/utils/auth.utils');
				expect(hasDerivationOrigin()).toBe(true);
			});
		});

		describe('env configured with empty', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.stubEnv('VITE_AUTH_DERIVATION_ORIGIN', '');
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('should return false if the derivation origin is empty', async () => {
				const { hasDerivationOrigin } = await import('$lib/utils/auth.utils');
				expect(hasDerivationOrigin()).toBe(false);
			});
		});

		describe('env not configured', () => {
			it('should return false if the derivation origin is not set', async () => {
				const { hasDerivationOrigin } = await import('$lib/utils/auth.utils');
				expect(hasDerivationOrigin()).toBe(false);
			});
		});
	});
});
