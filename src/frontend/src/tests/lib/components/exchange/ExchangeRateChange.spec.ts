import ExchangeRateChange from '$lib/components/exchange/ExchangeRateChange.svelte';
import { Currency } from '$lib/enums/currency';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { currencyStore } from '$lib/stores/currency.store';
import { render } from '@testing-library/svelte';

describe('ExchangeRateChange', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		currencyStore.switchCurrency(Currency.USD);

		currencyExchangeStore.setExchangeRateCurrency(Currency.USD);
		currencyExchangeStore.setExchangeRate(1);
		currencyExchangeStore.setExchangeRate24hChangeMultiplier(1);
	});

	it('should render nothing if the price change percentage is not given', () => {
		const { container } = render(ExchangeRateChange);

		expect(container.querySelectorAll('*')).toHaveLength(0);

		expect(container).toHaveTextContent('');

		expect(container.innerHTML).toBe('<!---->');
	});

	it('should render a positive price change', () => {
		const { getByText } = render(ExchangeRateChange, {
			props: {
				usdPriceChangePercentage24h: 1.23456
			}
		});

		expect(getByText('1.23%')).toBeInTheDocument();

		const symbol = getByText('▾');

		expect(symbol).toBeInTheDocument();
		expect(symbol).toHaveClass('rotate-180');
	});

	it('should render a negative price change', () => {
		const { getByText } = render(ExchangeRateChange, {
			props: {
				usdPriceChangePercentage24h: -123.456
			}
		});

		expect(getByText('123%')).toBeInTheDocument();

		const symbol = getByText('▾');

		expect(symbol).toBeInTheDocument();
		expect(symbol).not.toHaveClass('rotate-180');
	});

	it('should render a zero price change', () => {
		const { getByText } = render(ExchangeRateChange, {
			props: {
				usdPriceChangePercentage24h: 0
			}
		});

		expect(getByText('0.00%')).toBeInTheDocument();

		expect(getByText('▸')).toBeInTheDocument();
	});
});
