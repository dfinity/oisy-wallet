import { BACKEND_EXCHANGE_ENABLED } from '$env/exchange.env';
import * as backendApi from '$lib/api/backend.api';
import { loadBackendExchangeEnabled } from '$lib/services/backend-exchange-enabled.services';
import * as consoleUtils from '$lib/utils/console.utils';

describe('backend-exchange-enabled.services', () => {
	describe('loadBackendExchangeEnabled', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);
		});

		it('returns the value reported by the backend query', async () => {
			const spy = vi.spyOn(backendApi, 'exchangeRateEnabled').mockResolvedValue(true);

			const result = await loadBackendExchangeEnabled();

			expect(result).toBeTruthy();
			expect(spy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					certified: false,
					identity: expect.anything()
				})
			);
		});

		it('returns false when the backend query reports false', async () => {
			vi.spyOn(backendApi, 'exchangeRateEnabled').mockResolvedValue(false);

			const result = await loadBackendExchangeEnabled();

			expect(result).toBeFalsy();
		});

		it('falls back to BACKEND_EXCHANGE_ENABLED when the query rejects', async () => {
			vi.spyOn(backendApi, 'exchangeRateEnabled').mockRejectedValue(new Error('unreachable'));

			const result = await loadBackendExchangeEnabled();

			expect(result).toBe(BACKEND_EXCHANGE_ENABLED);
			expect(consoleUtils.consoleError).toHaveBeenCalledOnce();
		});

		describe('with backend exchange mode disallowed by the build environment', () => {
			beforeEach(() => {
				vi.resetModules();

				vi.doMock('$env/exchange.env', () => ({
					BACKEND_EXCHANGE_ENABLED: false,
					EXCHANGE_DISABLED: false
				}));
			});

			afterEach(() => {
				vi.doUnmock('$env/exchange.env');
			});

			it('returns false without querying the backend', async () => {
				const services = await import('$lib/services/backend-exchange-enabled.services');
				const api = await import('$lib/api/backend.api');

				const spy = vi.spyOn(api, 'exchangeRateEnabled').mockResolvedValue(true);

				const result = await services.loadBackendExchangeEnabled();

				expect(result).toBeFalsy();
				expect(spy).not.toHaveBeenCalled();
			});
		});
	});
});
