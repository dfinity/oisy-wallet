import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import OpenCryptoPay from '$lib/components/scanner/OpenCryptoPay.svelte';
import en from '$lib/i18n/en.json';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type {
	OpenCryptoPayResponse,
	PayableTokenWithConvertedAmount
} from '$lib/types/open-crypto-pay';
import * as formatUtils from '$lib/utils/format.utils';
import * as i18nUtils from '$lib/utils/i18n.utils';
import { render, screen } from '@testing-library/svelte';
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

describe('OpenCryptoPay', () => {
	const mockPaymentData: OpenCryptoPayResponse = {
		id: 'pl_test123',
		externalId: 'test-external',
		mode: 'Multiple',
		tag: 'payRequest',
		callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test123',
		minSendable: 1000,
		maxSendable: 10000,
		metadata: '[["text/plain", "Test"]]',
		displayName: 'Test Shop',
		standard: 'OpenCryptoPay',
		possibleStandards: ['OpenCryptoPay'],
		displayQr: true,
		recipient: {
			name: 'Test Merchant',
			address: {
				street: 'Bahnhofstrasse',
				houseNumber: '7',
				city: 'Zug',
				zip: '6300',
				country: 'CH'
			},
			phone: '+41791234567',
			mail: 'test@example.com',
			website: 'https://example.com',
			registrationNumber: 'CHE-123.456.789',
			storeType: 'Physical',
			merchantCategory: 'Retail',
			goodsType: 'Tangible',
			goodsCategory: 'General'
		},
		route: 'Test Route',
		quote: {
			id: 'quote123',
			expiration: '2025-12-31T23:59:59.000Z',
			payment: 'payment123'
		},
		requestedAmount: {
			asset: 'CHF',
			amount: '10'
		},
		transferAmounts: []
	};

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

	const createMockContext = ({
		data,
		selectedToken,
		availableTokens
	}: {
		data: OpenCryptoPayResponse | undefined;
		selectedToken: PayableTokenWithConvertedAmount | undefined;
		availableTokens: PayableTokenWithConvertedAmount[];
	}) => ({
		data: writable(data),
		selectedToken: writable(selectedToken),
		availableTokens: writable(availableTokens)
	});

	const renderWithContext = ({
		data = undefined,
		selectedToken = undefined,
		onSelectToken = vi.fn(),
		isTokenSelecting = false,
		availableTokens = []
	}: {
		data?: OpenCryptoPayResponse | undefined;
		selectedToken?: PayableTokenWithConvertedAmount | undefined;
		onSelectToken?: () => void;
		isTokenSelecting?: boolean;
		availableTokens?: PayableTokenWithConvertedAmount[];
	} = {}) => {
		const mockContext = createMockContext({ data, selectedToken, availableTokens });

		return render(OpenCryptoPay, {
			props: {
				onSelectToken,
				isTokenSelecting
			},
			context: new Map([[PAY_CONTEXT_KEY, mockContext]])
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(formatUtils, 'formatCurrency').mockImplementation(() => `$15.50`);
		vi.spyOn(i18nUtils, 'replacePlaceholders').mockImplementation(() => 'Pay $3,042.00');
	});

	describe('with payment data', () => {
		it('should render payment amount and asset', () => {
			renderWithContext({ data: mockPaymentData });

			expect(screen.getByText('10')).toBeInTheDocument();
			expect(screen.getByText('CHF')).toBeInTheDocument();
		});

		it('should render recipient name', () => {
			renderWithContext({ data: mockPaymentData });

			expect(screen.getByText('Test Merchant')).toBeInTheDocument();
		});

		it('should render Pay button as disabled', () => {
			renderWithContext({ data: mockPaymentData });

			const payButton = screen.getByRole('button', { name: /pay/i });

			expect(payButton).toBeDisabled();
		});
	});

	describe('without payment data', () => {
		it('should not render payment details when data is undefined', () => {
			renderWithContext();

			expect(screen.queryByText('Test Shop')).not.toBeInTheDocument();
			expect(screen.queryByText('Test Merchant')).not.toBeInTheDocument();
		});

		it('should still render Pay button', () => {
			vi.mocked(i18nUtils.replacePlaceholders).mockReturnValue('Pay');

			renderWithContext();

			expect(screen.getByRole('button', { name: 'Pay' })).toBeInTheDocument();
		});
	});

	describe('with partial payment data', () => {
		it('should handle missing displayName', () => {
			const dataWithoutDisplayName = {
				...mockPaymentData,
				displayName: undefined
			};

			renderWithContext({ data: dataWithoutDisplayName });

			expect(screen.getByText('10')).toBeInTheDocument();
			expect(screen.getByText('CHF')).toBeInTheDocument();
		});

		it('should handle missing recipient', () => {
			const dataWithoutRecipient = {
				...mockPaymentData,
				recipient: undefined
			};

			renderWithContext({ data: dataWithoutRecipient });

			expect(screen.queryByText('Test Merchant')).not.toBeInTheDocument();
		});

		it('should render with minimum required data', () => {
			const minimalData: OpenCryptoPayResponse = {
				id: 'test',
				tag: 'payRequest',
				callback: 'https://api.test.com',
				minSendable: 1000,
				maxSendable: 10000,
				metadata: '[]',
				requestedAmount: {
					asset: 'BTC',
					amount: '0.001'
				},
				transferAmounts: []
			};

			renderWithContext({ data: minimalData });

			expect(screen.getByText('0.001')).toBeInTheDocument();
			expect(screen.getByText('BTC')).toBeInTheDocument();
		});
	});

	describe('different payment amounts and assets', () => {
		it('should render EUR currency', () => {
			const data = {
				...mockPaymentData,
				requestedAmount: { asset: 'EUR', amount: '50' }
			};

			renderWithContext({ data });

			expect(screen.getByText('50')).toBeInTheDocument();
			expect(screen.getByText('EUR')).toBeInTheDocument();
		});

		it('should render BTC with decimals', () => {
			const data = {
				...mockPaymentData,
				requestedAmount: { asset: 'BTC', amount: '0.00123456' }
			};

			renderWithContext({ data });

			expect(screen.getByText('0.00123456')).toBeInTheDocument();
			expect(screen.getByText('BTC')).toBeInTheDocument();
		});

		it('should render large amounts', () => {
			const data = {
				...mockPaymentData,
				requestedAmount: { asset: 'CHF', amount: '1000000' }
			};

			renderWithContext({ data });

			expect(screen.getByText('1000000')).toBeInTheDocument();
		});
	});

	describe('pay button with token', () => {
		it('should show Pay with amount when token selected', () => {
			vi.mocked(i18nUtils.replacePlaceholders).mockReturnValue('Pay $3,042.00');

			renderWithContext({
				data: mockPaymentData,
				selectedToken: mockEthToken,
				availableTokens: [mockEthToken]
			});

			expect(screen.getByRole('button', { name: 'Pay $3,042.00' })).toBeInTheDocument();
		});

		it('should call replacePlaceholders with correct params', () => {
			vi.mocked(formatUtils.formatCurrency).mockReturnValue('$3,042.00');
			vi.mocked(i18nUtils.replacePlaceholders).mockReturnValue('Pay $3,042.00');

			renderWithContext({
				data: mockPaymentData,
				selectedToken: mockEthToken,
				availableTokens: [mockEthToken]
			});

			expect(i18nUtils.replacePlaceholders).toHaveBeenCalledWith(en.scanner.text.pay_amount, {
				$amount: '$3,042.00'
			});
		});

		it('should show plain Pay text when no token selected', () => {
			vi.mocked(i18nUtils.replacePlaceholders).mockReturnValue('Pay');

			renderWithContext({ data: mockPaymentData });

			expect(screen.getByRole('button', { name: 'Pay' })).toBeInTheDocument();
		});
	});

	describe('fee display', () => {
		it('should show fee when token selected', () => {
			vi.mocked(formatUtils.formatCurrency).mockReturnValue('$42.00');

			renderWithContext({
				data: mockPaymentData,
				selectedToken: mockEthToken,
				availableTokens: [mockEthToken]
			});

			expect(screen.getByText(en.fee.text.network_fee)).toBeInTheDocument();
		});

		it('should not show fee when no token', () => {
			renderWithContext({ data: mockPaymentData });

			expect(screen.queryByText(en.fee.text.network_fee)).not.toBeInTheDocument();
		});
	});
});
