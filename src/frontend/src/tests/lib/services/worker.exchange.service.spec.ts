import { Currency } from '$lib/enums/currency';
import { syncExchange } from '$lib/services/exchange.services';
import { initExchangeWorker, type ExchangeWorker } from '$lib/services/worker.exchange.services';
import { toastsError } from '$lib/stores/toasts.store';
import type {
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseExchange
} from '$lib/types/post-message';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockSplAddress } from '$tests/mocks/sol.mock';

vi.mock('$lib/services/exchange.services', () => ({
	syncExchange: vi.fn()
}));

vi.mock('$lib/stores/toasts.store', () => ({
	toastsError: vi.fn()
}));

const postMessageSpy = vi.fn();

class MockWorker {
	postMessage = postMessageSpy;
	onmessage: ((event: MessageEvent) => void) | null = null;
	terminate: () => void = vi.fn();
}

vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

let workerInstance: Worker;

vi.mock('$lib/workers/workers?worker', () => ({
	default: vi.fn().mockImplementation(() => {
		// @ts-expect-error testing this on purpose with a mock class
		workerInstance = new Worker();
		return workerInstance;
	})
}));

describe('worker.exchange.services', () => {
	describe('initExchangeWorker', () => {
		let worker: ExchangeWorker;

		const mockData: PostMessageDataRequestExchangeTimer = {
			currentCurrency: Currency.EUR,
			erc20Addresses: [{ address: mockEthAddress, coingeckoId: 'ethereum' }],
			icrcCanisterIds: [mockIcrcCustomToken.ledgerCanisterId],
			splAddresses: [mockSplAddress]
		};

		beforeEach(async () => {
			vi.clearAllMocks();

			worker = await initExchangeWorker();
		});

		it('should start the worker and send the correct start message', () => {
			worker.startExchangeTimer(mockData);

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({
				msg: 'startExchangeTimer',
				data: mockData
			});
		});

		it('should stop the worker and send the correct stop message', () => {
			worker.stopExchangeTimer();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({ msg: 'stopExchangeTimer' });
		});

		it('should destroy the worker', () => {
			worker.destroy();

			expect(postMessageSpy).toHaveBeenCalledExactlyOnceWith({ msg: 'stopExchangeTimer' });

			expect(workerInstance.terminate).toHaveBeenCalledOnce();
		});

		describe('onmessage', () => {
			it('should handle syncExchange message', () => {
				const mockData: PostMessageDataResponseExchange = {
					currentExchangeRate: { exchangeRateToUsd: 1.5, currency: Currency.EUR },
					currentEthPrice: { ethereum: { usd: 1 } },
					currentBtcPrice: { bitcoin: { usd: 50000 } },
					currentErc20Prices: {},
					currentIcpPrice: { 'internet-computer': { usd: 10 } },
					currentIcrcPrices: {},
					currentSolPrice: { solana: { usd: 100 } },
					currentSplPrices: {},
					currentBnbPrice: { binancecoin: { usd: 400 } },
					currentPolPrice: {}
				};
				const payload = { msg: 'syncExchange', data: mockData };
				workerInstance.onmessage?.({ data: payload } as MessageEvent);

				expect(syncExchange).toHaveBeenCalledExactlyOnceWith(mockData);
			});

			it('should handle syncExchangeError message', () => {
				const payload = {
					msg: 'syncExchangeError',
					data: { err: 'Exchange error' }
				};
				workerInstance.onmessage?.({ data: payload } as MessageEvent);

				expect(console.error).toHaveBeenCalledExactlyOnceWith(
					'An error occurred while attempting to retrieve the USD exchange rates.',
					'Exchange error'
				);

				expect(toastsError).not.toHaveBeenCalled();
			});
		});
	});
});
