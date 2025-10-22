import * as appConstants from '$lib/constants/app.constants';
import { getOptionalDerivationOrigin } from '$lib/utils/auth.utils';

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
				vi.resetAllMocks();
				vi.spyOn(appConstants, 'AUTH_ALTERNATIVE_ORIGINS', 'get').mockReturnValue(
					alternativeOrigins.join(',')
				);
				vi.spyOn(appConstants, 'AUTH_DERIVATION_ORIGIN', 'get').mockReturnValue(derivationOrigin);
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			describe.each(alternativeOrigins)('%s', (url) => {
				it('should return derivation if the origin is in the known alternative origins', () => {
					vi.stubGlobal('location', { origin: url });

					expect(getOptionalDerivationOrigin()).toEqual({
						derivationOrigin
					});
				});
			});

			it('should return empty object if the origin is not in the known alternative origins', () => {
				vi.stubGlobal('location', { origin: 'https://empty.com' });

				expect(getOptionalDerivationOrigin()).toEqual({});
			});
		});

		describe('with empty alternative origins', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.resetAllMocks();
				vi.spyOn(appConstants, 'AUTH_ALTERNATIVE_ORIGINS', 'get').mockReturnValue('');
				vi.spyOn(appConstants, 'AUTH_DERIVATION_ORIGIN', 'get').mockReturnValue(derivationOrigin);
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('should return empty object', () => {
				vi.stubGlobal('location', { origin: derivationOrigin });

				expect(getOptionalDerivationOrigin()).toEqual({});
			});
		});

		describe('with no derivation origin', () => {
			beforeEach(() => {
				vi.resetModules();
				vi.stubEnv('VITE_AUTH_ALTERNATIVE_ORIGINS', alternativeOrigins.join(','));
			});

			afterEach(() => {
				vi.unstubAllEnvs();
			});

			it('should return empty object', () => {
				vi.stubGlobal('location', { origin: alternativeOrigins[0] });

				expect(getOptionalDerivationOrigin()).toEqual({});
			});
		});

		describe('no environment set', () => {
			it('should return empty object', () => {
				vi.stubGlobal('location', { origin: derivationOrigin });

				expect(getOptionalDerivationOrigin()).toEqual({});
			});
		});
	});
});
