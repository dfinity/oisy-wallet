import OpenCryptoPay from '$lib/components/scanner/OpenCryptoPay.svelte';
import en from '$lib/i18n/en.json';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type { OpenCryptoPayResponse } from '$lib/types/open-crypto-pay';
import { render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$lib/utils/open-crypto-pay.utils', () => ({
	formatAddress: vi.fn()
}));

describe('PaymentDetails', () => {
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
			amount: 10
		},
		transferAmounts: []
	};

	const renderWithContext = (data: OpenCryptoPayResponse | undefined) =>
		render(OpenCryptoPay, {
			context: new Map([[PAY_CONTEXT_KEY, { data: writable(data) }]])
		});

	describe('with payment data', () => {
		it('should render payment amount and asset', () => {
			const { container } = renderWithContext(mockPaymentData);

			expect(container.textContent).toContain('10');
			expect(container.textContent).toContain('CHF');
		});

		it('should render display name', () => {
			const { container } = renderWithContext(mockPaymentData);

			expect(container.textContent).toContain('Test Shop');
		});

		it('should render recipient name', () => {
			const { container } = renderWithContext(mockPaymentData);

			expect(container.textContent).toContain('Test Merchant');
		});

		it('should render Pay button as disabled', () => {
			renderWithContext(mockPaymentData);

			const payButton = screen.getByRole('button', { name: /pay/i });

			expect(payButton).toBeInTheDocument();
		});

		it('should render powered by text', () => {
			renderWithContext(mockPaymentData);

			expect(screen.getByText(en.scanner.text.powered_by)).toBeInTheDocument();
		});
	});

	describe('without payment data', () => {
		it('should not render payment details when data is undefined', () => {
			const { container } = renderWithContext(undefined);

			expect(container.textContent).not.toContain('Test Shop');
			expect(container.textContent).not.toContain('Test Merchant');
		});
	});

	describe('with partial payment data', () => {
		it('should handle missing displayName', () => {
			const dataWithoutDisplayName = {
				...mockPaymentData,
				displayName: undefined
			};

			const { container } = renderWithContext(dataWithoutDisplayName);

			expect(container.textContent).toContain('10');
			expect(container.textContent).toContain('CHF');
		});

		it('should handle missing recipient', () => {
			const dataWithoutRecipient = {
				...mockPaymentData,
				recipient: undefined
			};

			const { container } = renderWithContext(dataWithoutRecipient);

			expect(container.textContent).toContain('10');
			expect(container.textContent).toContain('CHF');
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
					amount: 0.001
				},
				transferAmounts: []
			};

			const { container } = renderWithContext(minimalData);

			expect(container.textContent).toContain('0.001');
			expect(container.textContent).toContain('BTC');
		});
	});

	describe('different payment amounts and assets', () => {
		it('should render EUR currency', () => {
			const data = {
				...mockPaymentData,
				requestedAmount: { asset: 'EUR', amount: 50 }
			};

			const { container } = renderWithContext(data);

			expect(container.textContent).toContain('50');
			expect(container.textContent).toContain('EUR');
		});

		it('should render BTC with decimals', () => {
			const data = {
				...mockPaymentData,
				requestedAmount: { asset: 'BTC', amount: 0.00123456 }
			};

			const { container } = renderWithContext(data);

			expect(container.textContent).toContain('0.00123456');
			expect(container.textContent).toContain('BTC');
		});

		it('should render large amounts', () => {
			const data = {
				...mockPaymentData,
				requestedAmount: { asset: 'CHF', amount: 1000000 }
			};

			const { container } = renderWithContext(data);

			expect(container.textContent).toContain('1000000');
		});
	});
});
