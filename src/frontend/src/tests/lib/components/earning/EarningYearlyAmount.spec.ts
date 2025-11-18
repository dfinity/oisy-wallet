import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
import * as currencyDerived from '$lib/derived/currency.derived';
import * as i18nDerived from '$lib/derived/i18n.derived';
import { Currency as CurrencyEnum } from '$lib/enums/currency';
import { Languages as LangEnum } from '$lib/enums/languages';
import type { CurrencyExchangeStore } from '$lib/stores/currency-exchange.store';
import * as currencyExchange from '$lib/stores/currency-exchange.store';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { render, screen } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

const getFormattedText = ($amount: string) =>
	replacePlaceholders(get(i18n).stake.text.active_earning_per_year, { $amount });

describe('EarningYearlyAmount', () => {
	beforeEach(() => {
		vi.restoreAllMocks();

		vi.spyOn(i18nDerived, 'currentLanguage', 'get').mockReturnValue(writable(LangEnum.ENGLISH));

		vi.spyOn(currencyExchange, 'currencyExchangeStore', 'get').mockReturnValue(
			writable({
				currency: CurrencyEnum.USD,
				exchangeRateToUsd: 1
			}) as unknown as CurrencyExchangeStore
		);

		vi.spyOn(currencyDerived, 'currentCurrency', 'get').mockReturnValue(writable(CurrencyEnum.USD));
	});

	it('renders formatted yearly amount', () => {
		render(EarningYearlyAmount, { value: 123.45 });

		expect(screen.getByText(getFormattedText('$123.45'))).toBeInTheDocument();
	});

	it('renders with plus sign when showPlusSign is true', () => {
		render(EarningYearlyAmount, { value: 10, showPlusSign: true });

		expect(screen.getByText(getFormattedText('+$10.00'))).toBeInTheDocument();
	});

	it('applies text-success-primary class for positive amount when formatPositiveAmount is true', () => {
		const { container } = render(EarningYearlyAmount, { value: 5, formatPositiveAmount: true });

		const span = container.querySelector('span');

		expect(span).toHaveClass('text-success-primary');
	});

	it('applies text-brand-primary when formatPositiveAmount is false', () => {
		const { container } = render(EarningYearlyAmount, { value: 5, formatPositiveAmount: false });

		const span = container.querySelector('span');

		expect(span).toHaveClass('text-brand-primary');
	});

	it('renders nothing if value is null or undefined', () => {
		const { container, rerender } = render(EarningYearlyAmount, {
			value: undefined
		});

		expect(container.textContent?.trim()).toBe('');

		rerender({ value: null as unknown as number });

		expect(container.textContent?.trim()).toBe('');
	});
});
