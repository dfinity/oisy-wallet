import ExchangeWorker from '$lib/components/exchange/ExchangeWorker.svelte';
import { Currency } from '$lib/enums/currency';
import * as backendExchangeEnabledServices from '$lib/services/backend-exchange-enabled.services';
import { ExchangeWorker as ExchangeWorkerObj } from '$lib/services/worker.exchange.services';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { currencyStore } from '$lib/stores/currency.store';
import type * as SplDerived from '$sol/derived/spl.derived';
import type { SplTokenAddress } from '$sol/types/spl';
import { render } from '@testing-library/svelte';
import type { Writable } from 'svelte/store';

// Drive one provider-only token-list store directly so we can assert the
// backend-mode effect does NOT depend on it (while provider mode still does).
const mockStores = vi.hoisted(() => ({
	enabledSplTokenAddresses: null as Writable<SplTokenAddress[]> | null
}));

vi.mock('$sol/derived/spl.derived', async (importOriginal) => {
	const actual = await importOriginal<typeof SplDerived>();
	const { writable } = await import('svelte/store');
	mockStores.enabledSplTokenAddresses = writable<SplTokenAddress[]>([]);
	return { ...actual, enabledSplTokenAddresses: mockStores.enabledSplTokenAddresses };
});

describe('ExchangeWorker', () => {
	const stopExchangeTimer = vi.fn();
	const startExchangeTimer = vi.fn();
	const destroy = vi.fn();

	const mockWorker: ExchangeWorkerObj = {
		stopExchangeTimer,
		startExchangeTimer,
		destroy
	} as unknown as ExchangeWorkerObj;

	const waitTimer = () => vi.advanceTimersByTimeAsync(500 * 10);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		vi.spyOn(ExchangeWorkerObj, 'init').mockResolvedValue(mockWorker);
		vi.spyOn(backendExchangeEnabledServices, 'loadBackendExchangeEnabled').mockResolvedValue(false);

		mockStores.enabledSplTokenAddresses?.set([]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should initialize the worker on mount', async () => {
		render(ExchangeWorker);

		await waitTimer();

		expect(ExchangeWorkerObj.init).toHaveBeenCalledOnce();
	});

	it('should start the worker once when mounted', async () => {
		render(ExchangeWorker);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();

		expect(startExchangeTimer).toHaveBeenCalledExactlyOnceWith({
			currentCurrency: Currency.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: [],
			erc4626TokensExchangeData: [],
			backendExchangeEnabled: false
		});
	});

	it('should handle currency change', async () => {
		render(ExchangeWorker);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledOnce();

		expect(startExchangeTimer).toHaveBeenCalledExactlyOnceWith({
			currentCurrency: Currency.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: [],
			erc4626TokensExchangeData: [],
			backendExchangeEnabled: false
		});

		currencyStore.switchCurrency(Currency.CHF);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledTimes(2);

		expect(startExchangeTimer).toHaveBeenCalledTimes(2);
		expect(startExchangeTimer).toHaveBeenNthCalledWith(2, {
			currentCurrency: Currency.CHF,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: [],
			erc4626TokensExchangeData: [],
			backendExchangeEnabled: false
		});

		currencyStore.switchCurrency(Currency.USD);

		await waitTimer();

		expect(stopExchangeTimer).toHaveBeenCalledTimes(3);

		expect(startExchangeTimer).toHaveBeenCalledTimes(3);
		expect(startExchangeTimer).toHaveBeenNthCalledWith(3, {
			currentCurrency: Currency.USD,
			erc20Addresses: [],
			icrcCanisterIds: [],
			splAddresses: [],
			erc4626TokensExchangeData: [],
			backendExchangeEnabled: false
		});
	});

	it('should not be triggered by current currency exchange rate', async () => {
		render(ExchangeWorker);

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

	it('runs in backend mode and still restarts on always-relevant input change', async () => {
		vi.spyOn(backendExchangeEnabledServices, 'loadBackendExchangeEnabled').mockResolvedValue(true);

		render(ExchangeWorker);

		await waitTimer();

		// Started against the backend cache once the runtime flag resolves.
		expect(startExchangeTimer).toHaveBeenLastCalledWith(
			expect.objectContaining({ backendExchangeEnabled: true })
		);

		const callsBeforeCurrencyChange = startExchangeTimer.mock.calls.length;

		// Currency is relevant to the backend branch too, so it must still restart.
		currencyStore.switchCurrency(Currency.CHF);

		await waitTimer();

		expect(startExchangeTimer.mock.calls).toHaveLength(callsBeforeCurrencyChange + 1);
		expect(startExchangeTimer).toHaveBeenLastCalledWith(
			expect.objectContaining({ currentCurrency: Currency.CHF, backendExchangeEnabled: true })
		);
	});

	// Control: in provider mode a token-list change must still restart, which also
	// proves the store-driving mechanism below actually propagates to the worker.
	it('restarts in provider mode when a token-list store changes', async () => {
		render(ExchangeWorker);

		await waitTimer();

		const callsBefore = startExchangeTimer.mock.calls.length;

		mockStores.enabledSplTokenAddresses?.set(['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']);

		await waitTimer();

		expect(startExchangeTimer.mock.calls.length).toBeGreaterThan(callsBefore);
	});

	it('does NOT restart in backend mode when a token-list store changes', async () => {
		vi.spyOn(backendExchangeEnabledServices, 'loadBackendExchangeEnabled').mockResolvedValue(true);

		render(ExchangeWorker);

		await waitTimer();

		const callsBefore = startExchangeTimer.mock.calls.length;

		// The backend derives the token set server-side, so this input is not a
		// dependency of the backend-mode sync and must not trigger a restart.
		mockStores.enabledSplTokenAddresses?.set(['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']);

		await waitTimer();

		expect(startExchangeTimer.mock.calls).toHaveLength(callsBefore);
	});
});
