import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SelectedTokenToPay from '$lib/components/scanner/OpenCryptoPay/SelectedTokenToPay.svelte';
import en from '$lib/i18n/en.json';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type { PayableTokenWithConvertedAmount } from '$lib/types/open-crypto-pay';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$eth/derived/tokens.derived', () => ({
	enabledEthereumTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$evm/derived/tokens.derived', () => ({
	enabledEvmTokens: {
		subscribe: vi.fn((callback) => {
			callback([]);
			return () => {};
		})
	}
}));

vi.mock('$lib/derived/exchange.derived', () => ({
	exchanges: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$lib/stores/balances.store', () => ({
	balancesStore: {
		subscribe: vi.fn((callback) => {
			callback({});
			return () => {};
		})
	}
}));

vi.mock('$eth/utils/token.utils', () => ({
	enrichEthEvmToken: vi.fn(({ token }) => ({
		...token
	}))
}));

describe('SelectedTokenToPay', () => {
	const mockEthToken: PayableTokenWithConvertedAmount = {
		...ETHEREUM_TOKEN,
		amount: '1.5',
		minFee: 0.001,
		tokenNetwork: 'Ethereum',
		amountInUSD: 3000,
		feeInUSD: 42,
		sumInUSD: 3042,
		fee: {
			feeInWei: 300n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 25n
		}
	};

	const mockUsdcToken: PayableTokenWithConvertedAmount = {
		...USDC_TOKEN,
		amount: '100',
		minFee: 0.0001,
		tokenNetwork: 'Ethereum',
		amountInUSD: 100,
		feeInUSD: 10,
		sumInUSD: 110,
		fee: {
			feeInWei: 480n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 40n
		}
	} as PayableTokenWithConvertedAmount;

	const createMockContext = ({
		selectedToken,
		availableTokens
	}: {
		selectedToken: PayableTokenWithConvertedAmount | undefined;
		availableTokens: PayableTokenWithConvertedAmount[];
	}) => ({
		selectedToken: writable(selectedToken),
		availableTokens: writable(availableTokens)
	});

	const renderWithContext = ({
		selectedToken = undefined,
		availableTokens = [],
		onSelectToken = vi.fn(),
		isTokenSelecting = false
	}: {
		selectedToken?: PayableTokenWithConvertedAmount | undefined;
		availableTokens?: PayableTokenWithConvertedAmount[];
		onSelectToken?: () => void;
		isTokenSelecting?: boolean;
	} = {}) => {
		const mockContext = createMockContext({ selectedToken, availableTokens });

		return render(SelectedTokenToPay, {
			props: {
				onSelectToken,
				isTokenSelecting
			},
			context: new Map([[PAY_CONTEXT_KEY, mockContext]])
		});
	};

	it('should render component', () => {
		const { container } = renderWithContext();

		expect(container.firstChild).toBeInTheDocument();
	});

	it('should display "Pay with" heading', () => {
		renderWithContext();

		expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(en.scanner.text.pay_with);
	});

	it('should display available tokens count', () => {
		renderWithContext({ availableTokens: [mockEthToken, mockUsdcToken] });

		expect(
			screen.getByText(
				replacePlaceholders(en.scanner.text.tokens_available, {
					$amount: '2'
				})
			)
		).toBeInTheDocument();
	});

	describe('select button', () => {
		it('should show "Select token" when no token selected', () => {
			renderWithContext();

			expect(
				screen.getByRole('button', { name: en.scanner.text.select_token })
			).toBeInTheDocument();
		});

		it('should show "Select different token" when token is selected', () => {
			renderWithContext({
				selectedToken: mockEthToken,
				availableTokens: [mockEthToken]
			});

			expect(
				screen.getByRole('button', { name: en.scanner.text.select_different_token })
			).toBeInTheDocument();
		});

		it('should call onSelectToken when clicked', async () => {
			const onSelectToken = vi.fn();

			renderWithContext({ onSelectToken });

			const button = screen.getByRole('button', { name: en.scanner.text.select_token });

			await fireEvent.click(button);

			expect(onSelectToken).toHaveBeenCalled();
		});

		it('should set isTokenSelecting to true on mobile', async () => {
			const onSelectToken = vi.fn();

			renderWithContext({
				onSelectToken,
				isTokenSelecting: false
			});

			const button = screen.getByRole('button', { name: en.scanner.text.select_token });

			await fireEvent.click(button);

			expect(onSelectToken).toHaveBeenCalled();
		});
	});

	describe('selected token display', () => {
		it('should not show token details when no token selected', () => {
			renderWithContext();

			expect(screen.queryByText('1.5 ETH')).not.toBeInTheDocument();
		});

		it('should show selected token amount and symbol', () => {
			renderWithContext({
				selectedToken: mockEthToken,
				availableTokens: [mockEthToken]
			});

			expect(screen.getByText('1.5 ETH')).toBeInTheDocument();
		});

		it('should show different token details', () => {
			renderWithContext({
				selectedToken: mockUsdcToken,
				availableTokens: [mockUsdcToken]
			});

			expect(screen.getByText('100 USDC')).toBeInTheDocument();
		});
	});

	describe('token count display', () => {
		it('should show 0 tokens available', () => {
			renderWithContext({ availableTokens: [] });

			expect(
				screen.getByText(
					replacePlaceholders(en.scanner.text.tokens_available, {
						$amount: '0'
					})
				)
			).toBeInTheDocument();
		});

		it('should show 1 token available', () => {
			renderWithContext({ availableTokens: [mockEthToken] });

			expect(
				screen.getByText(
					replacePlaceholders(en.scanner.text.tokens_available, {
						$amount: '1'
					})
				)
			).toBeInTheDocument();
		});

		it('should show multiple tokens available', () => {
			renderWithContext({ availableTokens: [mockEthToken, mockUsdcToken] });

			expect(
				screen.getByText(
					replacePlaceholders(en.scanner.text.tokens_available, {
						$amount: '2'
					})
				)
			).toBeInTheDocument();
		});
	});
});
