import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
import * as currencyDerived from '$lib/derived/currency.derived';
import * as i18nDerived from '$lib/derived/i18n.derived';
import { Currency as CurrencyEnum, type Currency } from '$lib/enums/currency';
import { Languages as LangEnum, type Languages } from '$lib/enums/languages';
import type { CurrencyExchangeStore } from '$lib/stores/currency-exchange.store';
import * as currencyExchange from '$lib/stores/currency-exchange.store';
import { i18n } from '$lib/stores/i18n.store';
import type { CurrencyExchangeData } from '$lib/types/currency';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

const getFormattedText = ($amount: string) =>
	replacePlaceholders(get(i18n).stake.text.active_earning_per_year, { $amount });

describe('EarningYearlyAmount', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		const mockLanguage: Languages = LangEnum.ENGLISH;
		vi.spyOn(i18nDerived, 'currentLanguage', 'get').mockReturnValue({
			subscribe: (fn: (v: Languages) => void) => {
				fn(mockLanguage);
				return () => {};
			}
		});

		vi.spyOn(currencyExchange, 'currencyExchangeStore', 'get').mockReturnValue({
			subscribe: (fn: (v: CurrencyExchangeData) => void) => {
				fn({
					currency: CurrencyEnum.USD,
					exchangeRateToUsd: 1,
					exchangeRate24hChangeMultiplier: 1
				});
				return () => {};
			},
			setExchangeRateCurrency: vi.fn(),
			setExchangeRate: vi.fn(),
			setExchangeRate24hChangeMultiplier: vi.fn()
		} as CurrencyExchangeStore);

		vi.spyOn(currencyDerived, 'currentCurrency', 'get').mockReturnValue({
			subscribe: (fn: (v: Currency) => void) => {
				fn(CurrencyEnum.USD);
				return () => {};
			}
		});
	});

	it('renders formatted yearly amount', () => {
		render(EarningYearlyAmount, { value: 123.45 });

		expect(screen.getByText(getFormattedText('$123.45'))).toBeInTheDocument();
	});

	it('renders with plus sign when showPlusSign is true', () => {
		render(EarningYearlyAmount, { value: 10, showPlusSign: true });

		expect(screen.getByText(getFormattedText('+ $10.00'))).toBeInTheDocument();
	});

	it('applies text-success-primary class for positive amount when showAsSuccess is true', () => {
		const { container } = render(EarningYearlyAmount, { value: 5, showAsSuccess: true });

		const span = container.querySelector('span');

		expect(span).toHaveClass('text-success-primary');
	});

	it('applies text-error-primary when showAsError is true', () => {
		const { container } = render(EarningYearlyAmount, { value: 5, showAsError: true });

		const span = container.querySelector('span');

		expect(span).toHaveClass('text-error-primary');
	});

	it('applies text-brand-primary-alt when showAsNeutral is true', () => {
		const { container } = render(EarningYearlyAmount, { value: 5, showAsNeutral: true });

		const span = container.querySelector('span');

		expect(span).toHaveClass('text-brand-primary-alt');
	});

	it('applies text-tertiary when amount is 0', () => {
		const { container } = render(EarningYearlyAmount, { value: 0 });

		const span = container.querySelector('span');

		expect(span).toHaveClass('text-tertiary');
	});

	it('renders nothing if value is null or undefined and no fallback is provided', () => {
		const { container, rerender } = render(EarningYearlyAmount, {
			value: undefined
		});

		expect(container.textContent?.trim()).toBe('');

		rerender({ value: null as unknown as number });

		expect(container.textContent?.trim()).toBe('');
	});

	it('renders fallback if provided', () => {
		const { queryByTestId } = render(EarningYearlyAmount, {
			value: undefined,
			fallback: createMockSnippet('fallback')
		});

		expect(queryByTestId('fallback')).toBeInTheDocument();
	});
});
