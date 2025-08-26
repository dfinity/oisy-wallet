import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import { formatCurrency } from '$lib/utils/format.utils';
import { render } from '@testing-library/svelte';

describe('ExchangeAmountDisplay', () => {
	const mockAmount = 123456789123n;
	const mockDecimals = 3;
	const mockSymbol = 'MOCK';

	const mockProps = {
		amount: mockAmount,
		decimals: mockDecimals,
		symbol: mockSymbol,
		exchangeRate: undefined
	};

	const mockAmountNumber = Number(mockAmount) / 10 ** mockDecimals;

	const expectedAmount = '123456789.123 MOCK';

	const usdMinimum = 0.01;

	it('should render the amount', () => {
		const { getByText } = render(ExchangeAmountDisplay, { props: mockProps });

		expect(getByText(expectedAmount)).toBeInTheDocument();
	});

	it('should not render the USD amount if the exchange rate is not given', () => {
		const { queryByText } = render(ExchangeAmountDisplay, { props: mockProps });

		expect(queryByText('( ')).not.toBeInTheDocument();
		expect(queryByText('( < ')).not.toBeInTheDocument();
		expect(queryByText(' )')).not.toBeInTheDocument();
	});

	describe('with exchange rate', () => {
		const formatParams = {
			currency: Currency.USD,
			exchangeRate: {
				currency: Currency.USD,
				exchangeRateToUsd: 1
			},
			language: Languages.ENGLISH
		};

		it('should correctly render the USD amount if it is greater or equal than the threshold', () => {
			const mockExchangeRateBigAmount = (usdMinimum * 2) / mockAmountNumber;

			const expectedUsdAmount = `( ${formatCurrency({ value: mockAmountNumber * mockExchangeRateBigAmount, ...formatParams })} )`;

			const { getByText } = render(ExchangeAmountDisplay, {
				props: { ...mockProps, exchangeRate: mockExchangeRateBigAmount }
			});

			expect(getByText(expectedUsdAmount)).toBeInTheDocument();
		});

		it('should render the threshold if the USD amount is less the threshold', () => {
			const mockExchangeRateSmallAmount = usdMinimum / 2 / mockAmountNumber;

			const expectedUsdAmount = `( < ${formatCurrency({ value: usdMinimum, ...formatParams })} )`;

			const { getByText } = render(ExchangeAmountDisplay, {
				props: { ...mockProps, exchangeRate: mockExchangeRateSmallAmount }
			});

			expect(getByText(expectedUsdAmount)).toBeInTheDocument();
		});
	});
});
