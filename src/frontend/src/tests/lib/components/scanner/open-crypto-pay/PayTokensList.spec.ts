import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import PayTokensList from '$lib/components/scanner/open-crypto-pay/PayTokensList.svelte';
import en from '$lib/i18n/en.json';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type { PayableTokenWithConvertedAmount } from '$lib/types/open-crypto-pay';
import { nonNullish } from '@dfinity/utils';
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

describe('PayTokensList', () => {
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
	};

	const createMockContext = (availableTokens: PayableTokenWithConvertedAmount[]) => ({
		availableTokens: writable(availableTokens),
		selectToken: vi.fn()
	});

	const renderWithContext = ({
		availableTokens = [],
		onClose = vi.fn()
	}: {
		availableTokens?: PayableTokenWithConvertedAmount[];
		onClose?: () => void;
	} = {}) => {
		const mockContext = createMockContext(availableTokens);

		return render(PayTokensList, {
			props: { onClose },
			context: new Map([[PAY_CONTEXT_KEY, mockContext]])
		});
	};

	it('should render component', () => {
		const { container } = renderWithContext();

		expect(container).toBeInTheDocument();
	});

	describe('token list display', () => {
		it('should display token amount and symbol', () => {
			renderWithContext({ availableTokens: [mockEthToken] });

			expect(screen.getByText('1.5 ETH')).toBeInTheDocument();
		});

		it('should display multiple tokens', () => {
			renderWithContext({ availableTokens: [mockEthToken, mockUsdcToken] });

			expect(screen.getByText('1.5 ETH')).toBeInTheDocument();
			expect(screen.getByText('100 USDC')).toBeInTheDocument();
		});

		it('should display different token details', () => {
			renderWithContext({ availableTokens: [mockUsdcToken] });

			expect(screen.getByText('100 USDC')).toBeInTheDocument();
		});
	});

	describe('token selection', () => {
		it('should call selectToken when token clicked', async () => {
			const mockContext = createMockContext([mockEthToken]);
			const onClose = vi.fn();

			render(PayTokensList, {
				props: { onClose },
				context: new Map([[PAY_CONTEXT_KEY, mockContext]])
			});

			const button = screen.getByText('1.5 ETH').closest('button');

			if (nonNullish(button)) {
				await fireEvent.click(button);

				expect(mockContext.selectToken).toHaveBeenCalledWith(mockEthToken);
			}
		});

		it('should call onClose when token clicked', async () => {
			const mockContext = createMockContext([mockEthToken]);
			const onClose = vi.fn();

			render(PayTokensList, {
				props: { onClose },
				context: new Map([[PAY_CONTEXT_KEY, mockContext]])
			});

			const button = screen.getByText('1.5 ETH').closest('button');

			if (nonNullish(button)) {
				await fireEvent.click(button);

				expect(onClose).toHaveBeenCalled();
			}
		});

		it('should select correct token when multiple available', async () => {
			const mockContext = createMockContext([mockEthToken, mockUsdcToken]);
			const onClose = vi.fn();

			render(PayTokensList, {
				props: { onClose },
				context: new Map([[PAY_CONTEXT_KEY, mockContext]])
			});

			const usdcButton = screen.getByText('100 USDC').closest('button');

			if (nonNullish(usdcButton)) {
				await fireEvent.click(usdcButton);

				expect(mockContext.selectToken).toHaveBeenCalledWith(mockUsdcToken);
			}
		});
	});

	describe('empty state', () => {
		it('should show empty state when no tokens', () => {
			renderWithContext({ availableTokens: [] });

			expect(screen.getByText(en.scanner.text.supported_tokens)).toBeInTheDocument();
		});

		it('should not show list when no tokens', () => {
			renderWithContext({ availableTokens: [] });

			expect(screen.queryByText('1.5 ETH')).not.toBeInTheDocument();
		});

		it('should show empty state when tokens is undefined', () => {
			const mockContext = {
				availableTokens: writable(undefined),
				selectToken: vi.fn()
			};

			render(PayTokensList, {
				props: { onClose: vi.fn() },
				context: new Map([[PAY_CONTEXT_KEY, mockContext]])
			});

			expect(screen.getByText(en.scanner.text.supported_tokens)).toBeInTheDocument();
		});

		it('should show empty state when tokens is null', () => {
			const mockContext = {
				availableTokens: writable(null),
				selectToken: vi.fn()
			};

			render(PayTokensList, {
				props: { onClose: vi.fn() },
				context: new Map([[PAY_CONTEXT_KEY, mockContext]])
			});

			expect(screen.getByText(en.scanner.text.supported_tokens)).toBeInTheDocument();
		});
	});

	describe('token details', () => {
		it('should display token logo', () => {
			const { container } = renderWithContext({ availableTokens: [mockEthToken] });

			const logos = container.querySelectorAll('img, svg');

			expect(logos.length).toBeGreaterThan(0);
		});
	});
});
