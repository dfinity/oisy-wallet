import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import ScannerCode from '$lib/components/scanner/ScannerCode.svelte';
import { OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import * as openCryptoPayServices from '$lib/services/open-crypto-pay.services';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import type { OpenCryptoPayResponse, PayableTokenWithFees } from '$lib/types/open-crypto-pay';
import * as openCryptoPayUtils from '$lib/utils/open-crypto-pay.utils';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$lib/services/open-crypto-pay.services', () => ({
	processOpenCryptoPayCode: vi.fn(),
	calculateTokensWithFees: vi.fn()
}));

vi.mock('$lib/utils/open-crypto-pay.utils', () => ({
	prepareBasePayableTokens: vi.fn()
}));

vi.mock('$lib/derived/address.derived', async () => {
	const { writable } = await import('svelte/store');
	return {
		ethAddress: writable('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
	};
});

vi.mock('$lib/derived/networks.derived', async () => {
	const { readable } = await import('svelte/store');
	return {
		networksMainnets: readable([ETHEREUM_NETWORK])
	};
});

vi.mock('$lib/derived/tokens.derived', async () => {
	const { readable } = await import('svelte/store');
	return {
		nativeTokens: readable([ETHEREUM_TOKEN]),
		nonFungibleTokens: readable([]),
		enabledTokens: readable([ETHEREUM_TOKEN])
	};
});

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
	const mockSetsetAvailableTokens = vi.fn();

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
			amount: '10'
		},
		transferAmounts: [
			{
				method: 'Ethereum',
				available: true,
				minFee: 0.001,
				assets: [
					{
						asset: 'ETH',
						amount: '0.01'
					}
				]
			}
		]
	};

	const mockBaseTokens = [
		{
			...ETHEREUM_TOKEN,
			amount: '0.01',
			minFee: 0.001,
			tokenNetwork: 'Ethereum'
		}
	];

	const mockTokensWithFees: PayableTokenWithFees[] = [
		{
			...ETHEREUM_TOKEN,
			amount: '0.01',
			minFee: 0.001,
			tokenNetwork: 'Ethereum',
			fee: {
				feeInWei: 300n,
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				estimatedGasLimit: 25n
			}
		}
	];

	const renderWithContext = () =>
		render(ScannerCode, {
			props: {
				onNext: mockOnNext
			},
			context: new Map([
				[
					PAY_CONTEXT_KEY,
					{
						setData: mockSetData,
						setAvailableTokens: mockSetsetAvailableTokens,
						data: writable(null)
					}
				]
			])
		});

	const openManualEntry = async () => {
		const enterManuallyButton = screen.getByTestId(OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON);
		await fireEvent.click(enterManuallyButton);
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(openCryptoPayUtils.prepareBasePayableTokens).mockReturnValue(mockBaseTokens);
		vi.mocked(openCryptoPayServices.calculateTokensWithFees).mockResolvedValue(mockTokensWithFees);
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
			expect(mockSetData).toHaveBeenCalledWith(mockApiResponse);
			expect(mockOnNext).toHaveBeenCalled();
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

	describe('Token fee calculation flow', () => {
		it('should prepare base tokens with correct parameters', async () => {
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);
			renderWithContext();
			await openManualEntry();
			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'valid-code' } });
			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);
			await waitFor(() => {
				expect(openCryptoPayUtils.prepareBasePayableTokens).toHaveBeenCalledWith({
					transferAmounts: mockApiResponse.transferAmounts,
					networks: [ETHEREUM_NETWORK],
					availableTokens: [ETHEREUM_TOKEN]
				});
			});
		});

		it('should calculate fees for prepared tokens', async () => {
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);
			renderWithContext();
			await openManualEntry();
			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'valid-code' } });
			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);
			await waitFor(() => {
				expect(openCryptoPayServices.calculateTokensWithFees).toHaveBeenCalledWith({
					tokens: mockBaseTokens,
					userAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
				});
			});
		});

		it('should set tokens with fees in store', async () => {
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);
			renderWithContext();
			await openManualEntry();
			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'valid-code' } });
			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);
			await waitFor(() => {
				expect(mockSetsetAvailableTokens).toHaveBeenCalledWith(mockTokensWithFees);
			});
		});

		it('should handle fee calculation errors', async () => {
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);
			vi.mocked(openCryptoPayServices.calculateTokensWithFees).mockRejectedValue(
				new Error('Fee calculation failed')
			);
			renderWithContext();
			await openManualEntry();
			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'valid-code' } });
			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);
			await waitFor(() => {
				expect(screen.getByText(en.scanner.error.code_link_is_not_valid)).toBeInTheDocument();
			});

			expect(mockSetsetAvailableTokens).not.toHaveBeenCalled();
			expect(mockOnNext).not.toHaveBeenCalled();
		});

		it('should handle empty transferAmounts', async () => {
			const emptyResponse = {
				...mockApiResponse,
				transferAmounts: []
			};
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(emptyResponse);
			vi.mocked(openCryptoPayUtils.prepareBasePayableTokens).mockReturnValue([]);
			vi.mocked(openCryptoPayServices.calculateTokensWithFees).mockResolvedValue([]);
			renderWithContext();
			await openManualEntry();
			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'valid-code' } });
			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);
			await waitFor(() => {
				expect(mockSetsetAvailableTokens).toHaveBeenCalledWith([]);
				expect(mockOnNext).toHaveBeenCalled();
			});
		});
	});
});
