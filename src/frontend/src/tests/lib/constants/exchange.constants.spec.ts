import { SECONDS_IN_MINUTE } from '$lib/constants/app.constants';

describe('exchange.constants', () => {
	const fastProviderEnvs = ['ic', 'beta'];
	const slowProviderEnvs = ['local', 'test_fe_1', 'audit', 'e2e', 'staging'];

	beforeEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	describe('getSyncExchangeTimerInterval', () => {
		it.each([...fastProviderEnvs, ...slowProviderEnvs])(
			'should sync every minute from the backend on %s',
			async (mode) => {
				vi.stubGlobal('VITE_DFX_NETWORK', mode);
				const { getSyncExchangeTimerInterval } = await import('$lib/constants/exchange.constants');

				expect(getSyncExchangeTimerInterval(true)).toBe(SECONDS_IN_MINUTE * 1000);
			}
		);

		it.each(fastProviderEnvs)(
			'should sync every 5 minutes from the providers on %s',
			async (mode) => {
				vi.stubGlobal('VITE_DFX_NETWORK', mode);
				const { getSyncExchangeTimerInterval } = await import('$lib/constants/exchange.constants');

				expect(getSyncExchangeTimerInterval(false)).toBe(SECONDS_IN_MINUTE * 1000 * 5);
			}
		);

		it.each(slowProviderEnvs)(
			'should sync every 30 minutes from the providers on %s',
			async (mode) => {
				vi.stubGlobal('VITE_DFX_NETWORK', mode);
				const { getSyncExchangeTimerInterval } = await import('$lib/constants/exchange.constants');

				expect(getSyncExchangeTimerInterval(false)).toBe(SECONDS_IN_MINUTE * 1000 * 30);
			}
		);
	});
});
