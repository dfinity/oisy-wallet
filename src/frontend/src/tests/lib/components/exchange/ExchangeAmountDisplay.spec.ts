import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
import { ZERO } from '$lib/constants/app.constants';
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

	// Rounded to eight decimals, these would read as zero, which on a token approval is a revocation.
	it.each([1n, 1_000_000_000n, 4_999_999_999n])(
		'should state a nonzero amount of %s below eight decimals as less than the smallest step',
		(amount) => {
			const { getByText, queryByText } = render(ExchangeAmountDisplay, {
				props: { ...mockProps, amount, decimals: 18 }
			});

			expect(getByText(`< 0.00000001 ${mockSymbol}`)).toBeInTheDocument();
			expect(queryByText(`0 ${mockSymbol}`)).not.toBeInTheDocument();
		}
	);

	it('should round an amount of half the eighth decimal up to it', () => {
		const { getByText } = render(ExchangeAmountDisplay, {
			props: { ...mockProps, amount: 5_000_000_000n, decimals: 18 }
		});

		expect(getByText(`0.00000001 ${mockSymbol}`)).toBeInTheDocument();
	});

	it('should state a zero amount as zero', () => {
		const { getByText } = render(ExchangeAmountDisplay, {
			props: { ...mockProps, amount: ZERO, decimals: 18 }
		});

		expect(getByText(`0 ${mockSymbol}`)).toBeInTheDocument();
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
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: 1
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
