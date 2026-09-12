import SwapMinimumAmountInfo from '$lib/components/swap/SwapMinimumAmountInfo.svelte';
import { SWAP_MINIMUM_AMOUNT_INFO } from '$lib/constants/test-ids.constants';
import * as currencyDerived from '$lib/derived/currency.derived';
import { Currency } from '$lib/enums/currency';
import * as currencyExchangeStoreModule from '$lib/stores/currency-exchange.store';
import { nearIntentsSwapLimitStore } from '$lib/stores/near-intents-swap-limit.store';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import type { SwapMappedResult } from '$lib/types/swap';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapMinimumAmountInfo', () => {
	let context: Map<symbol, unknown>;

	const setupSwapAmountsStore = (swaps: SwapMappedResult[] = []) => {
		const store = initSwapAmountsStore();

		store.setSwaps({ swaps, amountForSwap: 1, selectedProvider: swaps[0] });

		context = new Map([[SWAP_AMOUNTS_CONTEXT_KEY, { store }]]);
	};

	const renderInfo = () => render(SwapMinimumAmountInfo, { context });

	const mockCurrency = ({
		currency,
		exchangeRateToUsd
	}: {
		currency: Currency;
		exchangeRateToUsd: number | null;
	}) => {
		vi.spyOn(currencyDerived, 'currentCurrency', 'get').mockReturnValue(readable(currency));
		vi.spyOn(currencyExchangeStoreModule, 'currencyExchangeStore', 'get').mockReturnValue({
			...readable({ currency, exchangeRateToUsd, exchangeRate24hChangeMultiplier: null }),
			setExchangeRate: vi.fn(),
			setExchangeRateCurrency: vi.fn(),
			setExchangeRate24hChangeMultiplier: vi.fn()
		});
	};

	beforeEach(() => {
		nearIntentsSwapLimitStore.reset();
		setupSwapAmountsStore();
	});

	afterEach(() => {
		nearIntentsSwapLimitStore.reset();
		vi.restoreAllMocks();
	});

	it('should name the limit in the display currency', () => {
		nearIntentsSwapLimitStore.set(1000);

		const { getByText } = renderInfo();

		expect(
			getByText(
				replacePlaceholders(en.swap.text.swap_minimum_amount_hint, { $amount: '$1,000.00' })
			)
		).toBeInTheDocument();
	});

	it('should convert the limit into the selected currency', () => {
		mockCurrency({ currency: Currency.EUR, exchangeRateToUsd: 1.25 });

		nearIntentsSwapLimitStore.set(1000);

		const { getByText } = renderInfo();

		expect(
			getByText(replacePlaceholders(en.swap.text.swap_minimum_amount_hint, { $amount: '€800.00' }))
		).toBeInTheDocument();
	});

	it('should render nothing when the pair has no limit', () => {
		const { queryByTestId } = renderInfo();

		expect(queryByTestId(SWAP_MINIMUM_AMOUNT_INFO)).not.toBeInTheDocument();
	});

	// An offer answers the question the notice exists to pre-empt.
	it('should step out of the way once a provider has quoted', () => {
		setupSwapAmountsStore(mockSwapProviders);
		nearIntentsSwapLimitStore.set(1000);

		const { queryByTestId } = renderInfo();

		expect(queryByTestId(SWAP_MINIMUM_AMOUNT_INFO)).not.toBeInTheDocument();
	});

	it('should stay while a quote round returned no offers', () => {
		setupSwapAmountsStore([]);
		nearIntentsSwapLimitStore.set(1000);

		const { getByTestId } = renderInfo();

		expect(getByTestId(SWAP_MINIMUM_AMOUNT_INFO)).toBeInTheDocument();
	});

	// A bare number with no currency on it would be worse than saying nothing.
	it('should render nothing while no exchange rate is available', () => {
		mockCurrency({ currency: Currency.EUR, exchangeRateToUsd: null });

		nearIntentsSwapLimitStore.set(1000);

		const { queryByTestId, queryByText } = renderInfo();

		expect(queryByTestId(SWAP_MINIMUM_AMOUNT_INFO)).not.toBeInTheDocument();
		expect(queryByText(/1,000/)).not.toBeInTheDocument();
	});
});
