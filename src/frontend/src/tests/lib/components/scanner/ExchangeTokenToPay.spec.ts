import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import ExchangeTokenToPay from '$lib/components/scanner/ExchangeTokenToPay.svelte';
import { OPEN_CRYPTO_PAY_AMOUNT_DISPLAY_SKELETON } from '$lib/constants/test-ids.constants';
import type { PayableTokenWithConvertedAmount } from '$lib/types/open-crypto-pay';
import { formatCurrency } from '$lib/utils/format.utils';
import { render, screen } from '@testing-library/svelte';

vi.mock('$lib/utils/format.utils', () => ({
	formatCurrency: vi.fn()
}));

describe('ExchangeTokenToPay.svelte', () => {
	const mockToken: PayableTokenWithConvertedAmount = {
		...ETHEREUM_TOKEN,
		amount: '0.01',
		minFee: 0.001,
		tokenNetwork: 'Ethereum',
		amountInUSD: 15.5,
		feeInUSD: 2.5,
		sumInUSD: 18.0,
		fee: {
			feeInWei: 300n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 25n
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(formatCurrency).mockReturnValue('$3,000.00');
	});

	it('should display formatted amount when amountInUSD is present', () => {
		render(ExchangeTokenToPay, { props: { token: mockToken } });

		expect(screen.getByText('$3,000.00')).toBeInTheDocument();
	});

	it('should display skeleton when amountInUSD is undefined', () => {
		const tokenWithoutAmount = {
			...mockToken,
			amountInUSD: undefined
		};

		render(ExchangeTokenToPay, { props: { token: tokenWithoutAmount } });

		expect(screen.getByTestId(OPEN_CRYPTO_PAY_AMOUNT_DISPLAY_SKELETON)).toBeInTheDocument();
	});

	it('should not display skeleton when amountInUSD is 0', () => {
		const tokenWithZeroAmount = {
			...mockToken,
			amountInUSD: 0
		};

		render(ExchangeTokenToPay, { props: { token: tokenWithZeroAmount } });

		expect(screen.queryByTestId(OPEN_CRYPTO_PAY_AMOUNT_DISPLAY_SKELETON)).not.toBeInTheDocument();
	});

	it('should format amount with EUR currency', () => {
		vi.mocked(formatCurrency).mockReturnValue('€3.000,00');

		render(ExchangeTokenToPay, { props: { token: mockToken } });

		expect(screen.getByText('€3.000,00')).toBeInTheDocument();
	});

	it('should handle very small amounts', () => {
		const tokenWithSmallAmount = {
			...mockToken,
			amountInUSD: 0.01
		};

		vi.mocked(formatCurrency).mockReturnValue('$0.01');

		render(ExchangeTokenToPay, { props: { token: tokenWithSmallAmount } });

		expect(screen.getByText('$0.01')).toBeInTheDocument();
	});

	it('should handle decimal amounts', () => {
		const tokenWithDecimal = {
			...mockToken,
			amountInUSD: 1234.56
		};

		vi.mocked(formatCurrency).mockReturnValue('$1,234.56');

		render(ExchangeTokenToPay, { props: { token: tokenWithDecimal } });

		expect(screen.getByText('$1,234.56')).toBeInTheDocument();
	});

	it('should render output element', () => {
		const { container } = render(ExchangeTokenToPay, { props: { token: mockToken } });

		expect(container.querySelector('output')).toBeInTheDocument();
	});

	it('should have break-all class on output', () => {
		const { container } = render(ExchangeTokenToPay, { props: { token: mockToken } });

		const output = container.querySelector('output');

		expect(output).toHaveClass('break-all');
	});

	it('should not display skeleton for zero amount', () => {
		const tokenWithZero = {
			...mockToken,
			amountInUSD: 0
		};

		vi.mocked(formatCurrency).mockReturnValue('$0.00');

		render(ExchangeTokenToPay, { props: { token: tokenWithZero } });

		expect(screen.getByText('$0.00')).toBeInTheDocument();
		expect(screen.queryByTestId(OPEN_CRYPTO_PAY_AMOUNT_DISPLAY_SKELETON)).not.toBeInTheDocument();
	});
});
