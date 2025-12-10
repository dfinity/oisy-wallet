import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import PaymentStatusHero from '$lib/components/scanner/open-crypto-pay/PaymentStatusHero.svelte';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type {
	OpenCryptoPayResponse,
	PayableTokenWithConvertedAmount
} from '$lib/types/open-crypto-pay';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('PaymentStatusHero', () => {
	const mockToken: PayableTokenWithConvertedAmount = {
		...USDC_TOKEN,
		amount: '100',
		minFee: 0.0001,
		tokenNetwork: 'Ethereum',
		amountInUSD: 100,
		feeInUSD: 10,
		sumInUSD: 110,
		fee: {
			feeInWei: 300000n,
			feeData: {
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			},
			estimatedGasLimit: 25000n
		}
	};

	const mockData: OpenCryptoPayResponse = {
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
		requestedAmount: {
			asset: 'CHF',
			amount: '10'
		},
		transferAmounts: []
	};

	const createMockContext = ({
		selectedToken,
		data
	}: {
		selectedToken: PayableTokenWithConvertedAmount;
		data: OpenCryptoPayResponse;
	}) => ({
		selectedToken: readable(selectedToken),
		data: readable(data),
		progress: vi.fn()
	});

	const renderWithContext = ({
		status,
		selectedToken = mockToken,
		data = mockData
	}: {
		status: 'success' | 'failure';
		selectedToken?: PayableTokenWithConvertedAmount;
		data?: OpenCryptoPayResponse;
	}) => {
		const mockContext = createMockContext({ selectedToken, data });

		return render(PaymentStatusHero, {
			props: { status },
			context: new Map([[PAY_CONTEXT_KEY, mockContext]])
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Success status', () => {
		it('should render success message with receipt name', () => {
			const { getByText, container } = renderWithContext({ status: 'success' });

			expect(getByText(/Paid at Test Shop/i)).toBeInTheDocument();
			expect(container.querySelector('svg')).toBeInTheDocument();
		});

		it('should display token amount and symbol', () => {
			const { container } = renderWithContext({ status: 'success' });

			const output = container.querySelector('output');

			expect(output?.textContent).toContain('100');
			expect(output?.textContent).toContain('USDC');
		});

		it('should apply success background classes', () => {
			const { container } = renderWithContext({ status: 'success' });

			expect(container.querySelector('.bg-success-subtle-20')).toBeInTheDocument();
			expect(container.querySelector('.bg-brand-subtle-10')).toBeInTheDocument();
		});

		it('should display "Powered by" text with OpenCryptoPay icon', () => {
			const { getByText, container } = renderWithContext({ status: 'success' });

			expect(getByText(en.scanner.text.powered_by)).toBeInTheDocument();
			expect(container.querySelector('svg')).toBeInTheDocument();
		});
	});

	describe('Failure status', () => {
		it('should render failure message with receipt name', () => {
			const { getByText, container } = renderWithContext({ status: 'failure' });

			expect(getByText(/FAiled to Pay at Test Shop/i)).toBeInTheDocument();
			expect(container.querySelector('svg')).toBeInTheDocument();
		});

		it('should display token amount and symbol', () => {
			const { container } = renderWithContext({ status: 'failure' });

			const output = container.querySelector('output');

			expect(output?.textContent).toContain('100');
			expect(output?.textContent).toContain('USDC');
		});

		it('should apply failure background classes', () => {
			const { container } = renderWithContext({ status: 'failure' });

			const errorDivs = container.querySelectorAll('.bg-error-subtle-20');

			expect(errorDivs.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('Different token amounts', () => {
		it('should render with decimal amount', () => {
			const tokenWithDecimal = {
				...mockToken,
				amount: '123.456789'
			};

			const { container } = renderWithContext({
				status: 'success',
				selectedToken: tokenWithDecimal
			});

			const amountElement = container.querySelector('data[value="123.456789"]');

			expect(amountElement).toBeInTheDocument();
			expect(amountElement?.textContent?.trim()).toBe('123.456789');

			const output = container.querySelector('output');

			expect(output?.textContent).toContain('123.456789');
		});

		it('should render with small amount', () => {
			const tokenWithSmallAmount = {
				...mockToken,
				amount: '0.0001234'
			};

			const { container } = renderWithContext({
				status: 'success',
				selectedToken: tokenWithSmallAmount
			});

			const output = container.querySelector('output');

			expect(output?.textContent).toContain('0.0001234');
			expect(output?.textContent).toContain('USDC');
		});
	});

	describe('Different token symbols', () => {
		it('should handle different token symbols', () => {
			const symbols = ['BTC', 'USDC', 'DAI', 'MATIC'];

			symbols.forEach((symbol) => {
				const token = {
					...mockToken,
					symbol
				};

				const { container } = renderWithContext({
					status: 'success',
					selectedToken: token
				});

				const output = container.querySelector('output');

				expect(output?.textContent).toContain(symbol);
				expect(container.querySelector('svg')).toBeInTheDocument();
			});
		});
	});

	describe('Different receipts', () => {
		it('should render different receipt names', () => {
			const receipts = ['Coffee Shop', 'Online Store', 'Gas Station', 'Restaurant'];

			receipts.forEach((receipt) => {
				const dataWithReceipt = {
					...mockData,
					displayName: receipt
				};

				const { getByText } = renderWithContext({
					status: 'success',
					data: dataWithReceipt
				});

				const successMessage = replacePlaceholders(en.scanner.text.pay_at_successful, {
					$receipt: receipt
				});

				expect(getByText(successMessage)).toBeInTheDocument();
			});
		});
	});

	describe('Styling', () => {
		it('should have rounded corners', () => {
			const { container } = renderWithContext({ status: 'success' });

			const mainDiv = container.querySelector('.rounded-\\[24px\\]');

			expect(mainDiv).toBeInTheDocument();
		});

		it('should center content', () => {
			const { container } = renderWithContext({ status: 'success' });

			const centerDiv = container.querySelector('.items-center.justify-center');

			expect(centerDiv).toBeInTheDocument();
		});

		it('should have proper text styling', () => {
			const { container } = renderWithContext({ status: 'success' });

			const textCenter = container.querySelector('.text-center');

			expect(textCenter).toBeInTheDocument();

			const fontBold = container.querySelector('.font-bold');

			expect(fontBold).toBeInTheDocument();
		});
	});
});
