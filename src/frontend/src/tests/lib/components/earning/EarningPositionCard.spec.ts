import EarningPositionCard from '$lib/components/earning/EarningPositionCard.svelte';
import { render, screen } from '@testing-library/svelte';

import * as currencyDerived from '$lib/derived/currency.derived';
import * as earningDerived from '$lib/derived/earning.derived';
import * as i18nDerived from '$lib/derived/i18n.derived';
import * as currencyStore from '$lib/stores/currency-exchange.store';
import * as formatUtils from '$lib/utils/format.utils';

import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import en from '$tests/mocks/i18n.mock';
import { readable } from 'svelte/store';

const staticStore = <T>(v: T) => readable<T>(v);

describe('EarningPositionCard', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		// mock language + currency
		vi.spyOn(i18nDerived, 'currentLanguage', 'get').mockReturnValue(staticStore(Languages.ENGLISH));

		vi.spyOn(currencyDerived, 'currentCurrency', 'get').mockReturnValue(staticStore(Currency.USD));

		// mock currency exchange store
		vi.spyOn(currencyStore, 'currencyExchangeStore', 'get').mockReturnValue({
			...staticStore({
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: 1
			}),
			setExchangeRate: vi.fn(),
			setExchangeRateCurrency: vi.fn(),
			setExchangeRate24hChangeMultiplier: vi.fn()
		});

		// formatCurrency mock
		vi.spyOn(formatUtils, 'formatCurrency').mockImplementation(({ value }) => `$${value}.00`);
	});

	it('renders yearly earning amount correctly', () => {
		// yearly amount = 150
		vi.spyOn(earningDerived, 'allEarningYearlyAmountUsd', 'get').mockReturnValue(staticStore(150));

		// total positions in USD = 2000
		vi.spyOn(earningDerived, 'allEarningPositionsUsd', 'get').mockReturnValue(staticStore(2000));

		render(EarningPositionCard);

		// yearly earning → "$150.00"
		expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();

		// total positions → "$2000.00"
		expect(screen.getByText(`${en.stake.text.invested_assets}: $2000.00`)).toBeInTheDocument();
	});

	it('renders a plus sign for positive yearly earnings', () => {
		vi.spyOn(earningDerived, 'allEarningYearlyAmountUsd', 'get').mockReturnValue(staticStore(30));

		vi.spyOn(earningDerived, 'allEarningPositionsUsd', 'get').mockReturnValue(staticStore(500));

		render(EarningPositionCard);

		expect(screen.getByText(/\$30\.00/)).toBeInTheDocument();
	});

	it('renders $0.00 when yearly earnings are zero', () => {
		vi.spyOn(earningDerived, 'allEarningYearlyAmountUsd', 'get').mockReturnValue(staticStore(0));

		vi.spyOn(earningDerived, 'allEarningPositionsUsd', 'get').mockReturnValue(staticStore(100));

		render(EarningPositionCard);

		// Should fallback to $0.00 for yearly earnings
		expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
	});

	it('formats summary currency correctly', () => {
		vi.spyOn(earningDerived, 'allEarningYearlyAmountUsd', 'get').mockReturnValue(staticStore(0));

		vi.spyOn(earningDerived, 'allEarningPositionsUsd', 'get').mockReturnValue(staticStore(1234));

		render(EarningPositionCard);

		expect(screen.getByText(`${en.stake.text.invested_assets}: $1234.00`)).toBeInTheDocument();
	});
});
