import { SUPPORTED_CURRENCIES } from '$env/currency.env';
import CurrencyDropdown from '$lib/components/currency/CurrencyDropdown.svelte';
import {
	CURRENCY_SWITCHER_BUTTON,
	CURRENCY_SWITCHER_DROPDOWN,
	CURRENCY_SWITCHER_DROPDOWN_BUTTON
} from '$lib/constants/test-ids.constants';
import { currentCurrency } from '$lib/derived/currency.derived';
import { Currency } from '$lib/enums/currency';
import { currencyStore } from '$lib/stores/currency.store';
import { i18n } from '$lib/stores/i18n.store';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

describe('CurrencyDropdown', () => {
	beforeEach(() => {
		currencyStore.switchCurrency(Currency.USD);
	});

	it('should render the dropdown switcher with the current currency', async () => {
		const { getByTestId, getByText } = render(CurrencyDropdown);

		expect(getByTestId(CURRENCY_SWITCHER_BUTTON)).toBeInTheDocument();

		expect(getByText('$ - USD')).toBeInTheDocument();

		currencyStore.switchCurrency(Currency.CHF);

		await tick();

		expect(getByText('CHF')).toBeInTheDocument();

		currencyStore.switchCurrency(Currency.EUR);

		await tick();

		expect(getByText('€ - EUR')).toBeInTheDocument();
	});

	it('is named by the visible currency and described by what it does', () => {
		const { getByRole } = render(CurrencyDropdown);

		const trigger = getByRole('button', { name: '$ - USD' });

		expect(trigger).not.toHaveAttribute('aria-label');
		expect(trigger).toHaveAccessibleDescription(get(i18n).core.alt.switch_currency);
	});

	it('should render the list of currencies when the dropdown is opened', async () => {
		const { getByTestId } = render(CurrencyDropdown);

		const dropdownButton = getByTestId(CURRENCY_SWITCHER_BUTTON);
		await fireEvent.click(dropdownButton);

		const container = getByTestId(CURRENCY_SWITCHER_DROPDOWN);

		expect(container).toBeInTheDocument();

		SUPPORTED_CURRENCIES.forEach(([_, currency]) => {
			const currencyButton = getByTestId(`${CURRENCY_SWITCHER_DROPDOWN_BUTTON}-${currency}`);

			expect(currencyButton).toBeInTheDocument();
			expect(container).toHaveTextContent(currency.toUpperCase());
		});
	});

	it('should render the symbol and the name of the currencies in the list', async () => {
		const { getByTestId, getByText } = render(CurrencyDropdown);

		const dropdownButton = getByTestId(CURRENCY_SWITCHER_BUTTON);
		await fireEvent.click(dropdownButton);

		const container = getByTestId(CURRENCY_SWITCHER_DROPDOWN);

		expect(container).toBeInTheDocument();

		expect(getByText('US Dollar')).toBeInTheDocument();
		expect(getByText('Euro')).toBeInTheDocument();
		expect(getByText('Swiss Franc')).toBeInTheDocument();

		expect(getByText('€ - EUR')).toBeInTheDocument();
		expect(getByText('CHF')).toBeInTheDocument();
	});

	it('should switch the currency when a new currency is selected', async () => {
		const { getByTestId } = render(CurrencyDropdown);

		const dropdownButton = getByTestId(CURRENCY_SWITCHER_BUTTON);
		await fireEvent.click(dropdownButton);

		const button = getByTestId(`${CURRENCY_SWITCHER_DROPDOWN_BUTTON}-${Currency.CHF}`);

		expect(button).toBeInTheDocument();

		await fireEvent.click(button);

		expect(get(currentCurrency)).toBe(Currency.CHF);
	});

	it('should close the dropdown when a currency is selected', async () => {
		const { getByTestId, getByText, queryByTestId } = render(CurrencyDropdown);

		const dropdownButton = getByTestId(CURRENCY_SWITCHER_BUTTON);
		await fireEvent.click(dropdownButton);

		const button = getByTestId(`${CURRENCY_SWITCHER_DROPDOWN_BUTTON}-${Currency.EUR}`);

		expect(button).toBeInTheDocument();

		await fireEvent.click(button);

		await waitFor(() => {
			expect(queryByTestId(CURRENCY_SWITCHER_DROPDOWN)).not.toBeInTheDocument();

			expect(getByText('€ - EUR')).toBeInTheDocument();
		});
	});
});
