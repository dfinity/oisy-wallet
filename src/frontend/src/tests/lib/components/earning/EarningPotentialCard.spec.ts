import EarningPotentialCard from '$lib/components/earning/EarningPotentialCard.svelte';
import { render, screen } from '@testing-library/svelte';

import * as currencyDerived from '$lib/derived/currency.derived';
import * as earningDerived from '$lib/derived/earning.derived';
import * as i18nDerived from '$lib/derived/i18n.derived';
import * as tokensDerived from '$lib/derived/tokens.derived';
import * as currencyStore from '$lib/stores/currency-exchange.store';
import * as formatUtils from '$lib/utils/format.utils';

import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
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
				exchangeRateToUsd: 1
			}),
			setExchangeRate: vi.fn(),
			setExchangeRateCurrency: vi.fn()
		});

		// Mock formatCurrency
		vi.spyOn(formatUtils, 'formatCurrency').mockImplementation(({ value }) => {
			return `$${value}.00`;
		});
	});

	it('renders yearly earning amount with correct values', () => {
		// Mock highest APY record
		vi.spyOn(earningDerived, 'highestApyEarningData', 'get').mockReturnValue(
			staticStore({ apy: '10', action: vi.fn() })
		);

		// Mock fungible USD balance
		vi.spyOn(tokensDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			staticStore(1000)
		);

		render(EarningPotentialCard);

		// Yearly earnings = 1000 * 10% = 100
		expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();

		// Summary shows "$1000.00"
		expect(screen.getByText('$1000.00')).toBeInTheDocument();
	});

	it('shows a plus sign when balance > 0 and APY > 0', () => {
		vi.spyOn(earningDerived, 'highestApyEarningData', 'get').mockReturnValue(
			staticStore({ apy: '15', action: vi.fn() })
		);
		vi.spyOn(tokensDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			staticStore(200)
		);

		render(EarningPotentialCard);

		// 200 * 15% = 30 -> "+$30.00"
		expect(screen.getByText(/\+\$30\.00/)).toBeInTheDocument();
	});

	it('handles invalid APY gracefully', () => {
		vi.spyOn(earningDerived, 'highestApyEarningData', 'get').mockReturnValue(
			staticStore({ apy: 'abc', action: vi.fn() })
		);
		vi.spyOn(tokensDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			staticStore(1000)
		);

		render(EarningPotentialCard);

		expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
	});

	it('handles missing highestApyEarningData gracefully', () => {
		vi.spyOn(earningDerived, 'highestApyEarningData', 'get').mockReturnValue(
			staticStore(undefined)
		);
		vi.spyOn(tokensDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			staticStore(1000)
		);

		render(EarningPotentialCard);

		expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
	});
});
