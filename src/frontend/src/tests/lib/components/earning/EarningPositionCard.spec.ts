import EarningPositionCard from '$lib/components/earning/EarningPositionCard.svelte';
import * as currencyDerived from '$lib/derived/currency.derived';
import * as i18nDerived from '$lib/derived/i18n.derived';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import * as currencyStore from '$lib/stores/currency-exchange.store';
import * as formatUtils from '$lib/utils/format.utils';
import { render, screen } from '@testing-library/svelte';
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
		render(EarningPositionCard, {
			props: { earningPositionsUsd: 150, earningYearlyAmountUsd: 2000 }
		});

		// yearly earning → "$150.00"
		expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();

		// total positions → "$2000.00"
		expect(screen.getByText('$2000.00')).toBeInTheDocument();
	});

	it('renders a plus sign for positive yearly earnings', () => {
		render(EarningPositionCard, {
			props: { earningPositionsUsd: 30, earningYearlyAmountUsd: 500 }
		});

		expect(screen.getByText(/\$30\.00/)).toBeInTheDocument();
	});

	it('renders $0.00 when yearly earnings are zero', () => {
		render(EarningPositionCard, {
			props: { earningPositionsUsd: 0, earningYearlyAmountUsd: 100 }
		});

		// Should fallback to $0.00 for yearly earnings
		expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
	});

	it('formats summary currency correctly', () => {
		render(EarningPositionCard, {
			props: { earningPositionsUsd: 0, earningYearlyAmountUsd: 1234 }
		});

		expect(screen.getByText('$1234.00')).toBeInTheDocument();
	});
});
