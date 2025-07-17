import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
import { Currencies } from '$lib/enums/currencies';
import * as exchangeServices from '$lib/services/worker.exchange.services';
import {
	initExchangeWorker,
	type ExchangeWorker as ExchangeWorkerType
} from '$lib/services/worker.exchange.services';
import { currencyStore } from '$lib/stores/currency.store';
import { render } from '@testing-library/svelte';

describe('ExchangeWorker', () => {
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
		render(ExchangeWorker);

		await waitTimer();

		expect(initExchangeWorker).toHaveBeenCalledTimes(1);
	});

	it('should start the worker once when mounted', async () => {
		render(ExchangeWorker);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();

		expect(startExchangeTimer).toHaveBeenCalledExactlyOnceWith({
			currentCurrency: Currencies.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: []
		});
	});

	it('should handle currency change', async () => {
		render(ExchangeWorker);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();

		expect(startExchangeTimer).toHaveBeenCalledExactlyOnceWith({
			currentCurrency: Currencies.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: []
		});

		currencyStore.switchCurrency(Currencies.CHF);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledTimes(2);

		expect(startExchangeTimer).toHaveBeenCalledTimes(2);
		expect(startExchangeTimer).toHaveBeenNthCalledWith(2, {
			currentCurrency: Currencies.CHF,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: []
		});

		currencyStore.switchCurrency(Currencies.USD);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledTimes(3);

		expect(startExchangeTimer).toHaveBeenCalledTimes(3);
		expect(startExchangeTimer).toHaveBeenNthCalledWith(3, {
			currentCurrency: Currencies.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: []
		});
	});

	it('should not be triggered by current currency exchange rate', async () => {
		render(ExchangeWorker);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();
		expect(startExchangeTimer).toHaveBeenCalledOnce();

		currencyStore.setExchangeRate(1.5);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();
		expect(startExchangeTimer).toHaveBeenCalledOnce();

		currencyStore.setExchangeRate(101);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();
		expect(startExchangeTimer).toHaveBeenCalledOnce();
	});
});
