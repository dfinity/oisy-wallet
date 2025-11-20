import ScannerCode from '$lib/components/scanner/ScannerCode.svelte';
import { OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import * as openCryptoPayServices from '$lib/services/open-crypto-pay.services';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type { OpenCryptoPayResponse } from '$lib/types/open-crypto-pay';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$lib/services/open-crypto-pay.services', () => ({
	processOpenCryptoPayCode: vi.fn()
}));

vi.mock('@dfinity/gix-components', async () => {
	const actual = await vi.importActual('@dfinity/gix-components');
	return {
		...actual,
		QRCodeReader: vi.fn().mockImplementation(() => ({
			$$render: () => '<div data-tid="mock-qr-reader">Mocked QR Reader</div>',
			$$slots: {},
			$$scope: {}
		}))
	};
});

describe('ScannerCode.svelte', () => {
	const mockOnNext = vi.fn();
	const mockSetData = vi.fn();

	const mockApiResponse: OpenCryptoPayResponse = {
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

	const renderWithContext = () =>
		render(ScannerCode, {
			props: {
				onNext: mockOnNext
			},
			context: new Map([[PAY_CONTEXT_KEY, { setData: mockSetData, data: writable(null) }]])
		});

	const openManualEntry = async () => {
		const enterManuallyButton = screen.getByTestId(OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON);
		await fireEvent.click(enterManuallyButton);
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render QR scanner', () => {
		const { container } = renderWithContext();

		expect(container.querySelector('[data-tid="address-book-qr-code-scan"]')).toBeInTheDocument();
	});

	it('should render enter manually button', () => {
		renderWithContext();

		expect(screen.getByTestId(OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON)).toBeInTheDocument();
	});

	it('should show input after clicking enter manually', async () => {
		renderWithContext();

		await openManualEntry();

		await waitFor(() => {
			expect(screen.getByPlaceholderText(en.scanner.text.enter_or_paste_code)).toBeInTheDocument();
		});
	});

	it('should disable continue button when empty', async () => {
		renderWithContext();

		await openManualEntry();

		await waitFor(() => {
			const button = screen.getByRole('button', { name: en.core.text.continue });

			expect(button).toBeDisabled();
		});
	});

	it('should enable continue button when uri entered', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: 'test-uri' } });

		await waitFor(() => {
			expect(screen.getByRole('button', { name: en.core.text.continue })).not.toBeDisabled();
		});
	});

	it('should show error on invalid code', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: 'invalid' } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(screen.getByText(en.scanner.error.code_link_is_not_valid)).toBeInTheDocument();
		});
	});

	it('should call onNext and setData on success', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);

		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: 'valid-code' } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalled();
			expect(mockSetData).toHaveBeenCalled();
		});
	});

	it('should clear error when input cleared', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);

		await fireEvent.input(input, { target: { value: 'invalid' } });
		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(screen.getByText(en.scanner.error.code_link_is_not_valid)).toBeInTheDocument();
		});

		await fireEvent.input(input, { target: { value: '' } });

		await waitFor(() => {
			expect(screen.queryByText(en.scanner.error.code_link_is_not_valid)).not.toBeInTheDocument();
		});
	});

	it('should clear uri and error when opening bottom sheet', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);

		await fireEvent.input(input, { target: { value: 'some-value' } });

		const enterManuallyButton = screen.getByTestId(OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON);
		await fireEvent.click(enterManuallyButton);

		await waitFor(() => {
			expect(input).toHaveValue('');
		});
	});

	it('should not clear error when uri changes to non-empty value', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);

		await fireEvent.input(input, { target: { value: 'invalid' } });
		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(screen.getByText(en.scanner.error.code_link_is_not_valid)).toBeInTheDocument();
		});

		await fireEvent.input(input, { target: { value: 'different-invalid-code' } });

		await waitFor(() => {
			expect(screen.getByText(en.scanner.error.code_link_is_not_valid)).toBeInTheDocument();
		});
	});
});
