import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
import { Currency } from '$lib/enums/currency';
import * as exchangeServices from '$lib/services/worker.exchange.services';
import {
	initExchangeWorker,
	type ExchangeWorker as ExchangeWorkerType
} from '$lib/services/worker.exchange.services';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { currencyStore } from '$lib/stores/currency.store';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

describe('ExchangeWorker', () => {
	const mockSnippet = createMockSnippet('Mock Snippet');

	const stopExchangeTimer = vi.fn();
	const startExchangeTimer = vi.fn();
	const destroy = vi.fn();

	const mockWorker: ExchangeWorkerType = {
		stopExchangeTimer,
		startExchangeTimer,
		destroy
	};

	const waitTimer = () => vi.advanceTimersByTimeAsync(500 * 10);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		vi.spyOn(exchangeServices, 'initExchangeWorker').mockResolvedValue(mockWorker);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should initialize the worker on mount', async () => {
		render(ExchangeWorker, { children: mockSnippet });

		await waitTimer();

		expect(initExchangeWorker).toHaveBeenCalledOnce();
	});

	it('should start the worker once when mounted', async () => {
		render(ExchangeWorker, { children: mockSnippet });

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();

		expect(startExchangeTimer).toHaveBeenCalledExactlyOnceWith({
			currentCurrency: Currency.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: []
		});
	});

	it('should handle currency change', async () => {
		render(ExchangeWorker, { children: mockSnippet });

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();

		expect(startExchangeTimer).toHaveBeenCalledExactlyOnceWith({
			currentCurrency: Currency.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: []
		});

		currencyStore.switchCurrency(Currency.CHF);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledTimes(2);

		expect(startExchangeTimer).toHaveBeenCalledTimes(2);
		expect(startExchangeTimer).toHaveBeenNthCalledWith(2, {
			currentCurrency: Currency.CHF,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: []
		});

		currencyStore.switchCurrency(Currency.USD);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledTimes(3);

		expect(startExchangeTimer).toHaveBeenCalledTimes(3);
		expect(startExchangeTimer).toHaveBeenNthCalledWith(3, {
			currentCurrency: Currency.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: []
		});
	});

	it('should not be triggered by current currency exchange rate', async () => {
		render(ExchangeWorker, { children: mockSnippet });

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();
		expect(startExchangeTimer).toHaveBeenCalledOnce();

		currencyExchangeStore.setExchangeRate(1.5);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();
		expect(startExchangeTimer).toHaveBeenCalledOnce();

		currencyExchangeStore.setExchangeRate(101);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();
		expect(startExchangeTimer).toHaveBeenCalledOnce();
	});
});
