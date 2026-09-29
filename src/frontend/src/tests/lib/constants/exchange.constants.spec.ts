import { SECONDS_IN_MINUTE } from '$lib/constants/app.constants';

describe('exchange.constants', () => {
	const nonProdEnvs = ['local', 'test_fe_1', 'audit', 'e2e', 'staging', 'beta'];

	beforeEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	describe('getSyncExchangeTimerInterval', () => {
		it.each(['ic', ...nonProdEnvs])(
			'should sync every minute from the backend on %s',
			async (mode) => {
				vi.stubGlobal('VITE_DFX_NETWORK', mode);
				const { getSyncExchangeTimerInterval } = await import('$lib/constants/exchange.constants');

				expect(getSyncExchangeTimerInterval(true)).toBe(SECONDS_IN_MINUTE * 1000);
			}
		);

		it('should sync every 5 minutes from the providers in production', async () => {
			vi.stubGlobal('VITE_DFX_NETWORK', 'ic');
			const { getSyncExchangeTimerInterval } = await import('$lib/constants/exchange.constants');

			expect(getSyncExchangeTimerInterval(false)).toBe(SECONDS_IN_MINUTE * 1000 * 5);
		});

		it.each(nonProdEnvs)('should sync every 30 minutes from the providers on %s', async (mode) => {
			vi.stubGlobal('VITE_DFX_NETWORK', mode);
			const { getSyncExchangeTimerInterval } = await import('$lib/constants/exchange.constants');

			expect(getSyncExchangeTimerInterval(false)).toBe(SECONDS_IN_MINUTE * 1000 * 30);
		});
	});
});
