import EarningPotentialCard from '$lib/components/earning/EarningPotentialCard.svelte';
import { render, screen } from '@testing-library/svelte';

import * as currencyDerived from '$lib/derived/currency.derived';
import * as earningDerived from '$lib/derived/earning.derived';
import * as i18nDerived from '$lib/derived/i18n.derived';
import * as tokensUiDerived from '$lib/derived/tokens-ui.derived';
import * as currencyStore from '$lib/stores/currency-exchange.store';
import * as formatUtils from '$lib/utils/format.utils';

import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import en from '$tests/mocks/i18n.mock';
import { readable } from 'svelte/store';

const staticStore = <T>(v: T) => readable<T>(v);

describe('EarningPotentialCard', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		// Mock language + currency
		vi.spyOn(i18nDerived, 'currentLanguage', 'get').mockReturnValue(staticStore(Languages.ENGLISH));
		vi.spyOn(currencyDerived, 'currentCurrency', 'get').mockReturnValue(staticStore(Currency.USD));

		// Mock currency exchange rate
		vi.spyOn(currencyStore, 'currencyExchangeStore', 'get').mockReturnValue({
			...staticStore({
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: 1
			}),
			setExchangeRate: vi.fn(),
			setExchangeRateCurrency: vi.fn()
		});

		// Mock formatCurrency
		vi.spyOn(formatUtils, 'formatCurrency').mockImplementation(({ value }) => `$${value}.00`);
	});

	it('renders yearly earning amount with correct values', () => {
		const mockTotalBalance = 1_000;
		const mockApy = 10;

		vi.spyOn(earningDerived, 'highestEarningPotentialUsd', 'get').mockReturnValue(
			staticStore((mockTotalBalance * mockApy) / 100)
		);
		vi.spyOn(tokensUiDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			staticStore(mockTotalBalance)
		);

		render(EarningPotentialCard);

		// Yearly earnings = 1000 * 10% = 100
		expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();

		// Summary shows "$1000.00"
		expect(screen.getByText(`${en.stake.text.unproductive_assets}: $1000.00`)).toBeInTheDocument();
	});

	it('shows a plus sign when balance > 0 and APY > 0', () => {
		const mockTotalBalance = 200;
		const mockApy = 15;

		vi.spyOn(earningDerived, 'highestEarningPotentialUsd', 'get').mockReturnValue(
			staticStore((mockTotalBalance * mockApy) / 100)
		);
		vi.spyOn(tokensUiDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			staticStore(mockTotalBalance)
		);

		render(EarningPotentialCard);

		// 200 * 15% = 30 -> "+ $30.00"
		expect(screen.getByText('+ $30.00/year')).toBeInTheDocument();
	});

	it('handles null earning potential gracefully', () => {
		const mockTotalBalance = 1_000;
		const mockApy = 0;

		vi.spyOn(earningDerived, 'highestEarningPotentialUsd', 'get').mockReturnValue(
			staticStore((mockTotalBalance * mockApy) / 100)
		);
		vi.spyOn(tokensUiDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			staticStore(mockTotalBalance)
		);

		render(EarningPotentialCard);

		expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
	});
});
