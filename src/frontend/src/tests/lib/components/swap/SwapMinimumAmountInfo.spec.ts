import SwapMinimumAmountInfo from '$lib/components/swap/SwapMinimumAmountInfo.svelte';
import { SWAP_MINIMUM_AMOUNT_INFO } from '$lib/constants/test-ids.constants';
import * as currencyDerived from '$lib/derived/currency.derived';
import { Currency } from '$lib/enums/currency';
import * as currencyExchangeStoreModule from '$lib/stores/currency-exchange.store';
import { nearIntentsSwapLimitStore } from '$lib/stores/near-intents-swap-limit.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapMinimumAmountInfo', () => {
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
	});

	afterEach(() => {
		nearIntentsSwapLimitStore.reset();
		vi.restoreAllMocks();
	});

	it('should name the limit in the display currency', () => {
		nearIntentsSwapLimitStore.set(1000);

		const { getByText } = render(SwapMinimumAmountInfo);

		expect(
			getByText(
				replacePlaceholders(en.swap.text.swap_minimum_amount_hint, { $amount: '$1,000.00' })
			)
		).toBeInTheDocument();
	});

	it('should convert the limit into the selected currency', () => {
		mockCurrency({ currency: Currency.EUR, exchangeRateToUsd: 1.25 });

		nearIntentsSwapLimitStore.set(1000);

		const { getByText } = render(SwapMinimumAmountInfo);

		expect(
			getByText(replacePlaceholders(en.swap.text.swap_minimum_amount_hint, { $amount: '€800.00' }))
		).toBeInTheDocument();
	});

	it('should render nothing when the pair has no limit', () => {
		const { queryByTestId } = render(SwapMinimumAmountInfo);

		expect(queryByTestId(SWAP_MINIMUM_AMOUNT_INFO)).not.toBeInTheDocument();
	});

	// A bare number with no currency on it would be worse than saying nothing.
	it('should render nothing while no exchange rate is available', () => {
		mockCurrency({ currency: Currency.EUR, exchangeRateToUsd: null });

		nearIntentsSwapLimitStore.set(1000);

		const { queryByTestId, queryByText } = render(SwapMinimumAmountInfo);

		expect(queryByTestId(SWAP_MINIMUM_AMOUNT_INFO)).not.toBeInTheDocument();
		expect(queryByText(/1,000/)).not.toBeInTheDocument();
	});
});
