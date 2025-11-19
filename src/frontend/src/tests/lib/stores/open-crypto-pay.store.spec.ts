import { initPayContext } from '$lib/stores/open-crypto-pay.store';
import type { OpenCryptoPayResponse } from '$lib/types/open-crypto-pay';
import { get } from 'svelte/store';

describe('OpenCryptoPayStore', () => {
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
				street: 'Test St',
				houseNumber: '1',
				city: 'Zurich',
				zip: '8000',
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

	it('should initialize with undefined data', () => {
		const context = initPayContext();

		expect(get(context.data)).toBeUndefined();
	});

	it('should set payment data', () => {
		const context = initPayContext();

		context.setData(mockPaymentData);

		expect(get(context.data)).toEqual({ data: mockPaymentData });
	});

	it('should override previous payment data when setting new one', () => {
		const context = initPayContext();

		const newPaymentData: OpenCryptoPayResponse = {
			...mockPaymentData,
			id: 'pl_new456',
			displayName: 'New Shop',
			requestedAmount: {
				asset: 'EUR',
				amount: 20
			}
		};

		context.setData(mockPaymentData);
		context.setData(newPaymentData);

		expect(get(context.data)).toEqual({ data: newPaymentData });
		expect(get(context.data)).not.toEqual({ data: mockPaymentData });
	});

	it('should update specific fields while preserving others', () => {
		const context = initPayContext();

		context.setData(mockPaymentData);

		const updatedData: OpenCryptoPayResponse = {
			...mockPaymentData,
			displayName: 'Updated Shop Name'
		};

		context.setData(updatedData);

		const result = get(context.data) as unknown as { data: OpenCryptoPayResponse };

		expect(result.data.displayName).toBe('Updated Shop Name');
		expect(result.data.id).toBe(mockPaymentData.id);
		expect(result.data.minSendable).toBe(mockPaymentData.minSendable);
	});

	it('should handle multiple consecutive updates', () => {
		const context = initPayContext();

		const firstUpdate: OpenCryptoPayResponse = {
			...mockPaymentData,
			displayName: 'First'
		};

		const secondUpdate: OpenCryptoPayResponse = {
			...mockPaymentData,
			displayName: 'Second'
		};

		const thirdUpdate: OpenCryptoPayResponse = {
			...mockPaymentData,
			displayName: 'Third'
		};

		context.setData(firstUpdate);
		context.setData(secondUpdate);
		context.setData(thirdUpdate);

		const result = get(context.data) as unknown as { data: OpenCryptoPayResponse };

		expect(result.data.displayName).toBe('Third');
	});
});
