import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import ScannerCode from '$lib/components/scanner/ScannerCode.svelte';
import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON } from '$lib/constants/test-ids.constants';
import en from '$lib/i18n/en.json';
import * as openCryptoPayServices from '$lib/services/open-crypto-pay.services';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import { screensStore } from '$lib/stores/screens.store';
import type {
	OpenCryptoPayResponse,
	PayableToken,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import { ScannerResults } from '$lib/types/scanner';
import * as deviceUtils from '$lib/utils/device.utils';
import * as openCryptoPayUtils from '$lib/utils/open-crypto-pay.utils';
import * as timeoutUtils from '$lib/utils/timeout.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockPrincipal, mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/services/open-crypto-pay.services', () => ({
	processOpenCryptoPayCode: vi.fn(),
	calculateTokensWithFees: vi.fn()
}));

vi.mock('$lib/utils/open-crypto-pay.utils', () => ({
	prepareBasePayableTokens: vi.fn()
}));

vi.mock('$lib/utils/timeout.utils', () => ({
	waitReady: vi.fn().mockResolvedValue('ready')
}));

vi.mock('$env/open-crypto-pay.env', () => ({
	OCP_PAY_WITH_BTC_ENABLED: true
}));

vi.mock('$btc/derived/tokens.derived', async () => {
	const { readable } = await import('svelte/store');
	return {
		enabledMainnetBitcoinToken: readable(undefined)
	};
});

vi.mock('$btc/stores/all-utxos.store', async () => {
	const { readable } = await import('svelte/store');
	return {
		allUtxosStore: readable(null)
	};
});

vi.mock('$btc/stores/btc-pending-sent-transactions.store', async () => {
	const { readable } = await import('svelte/store');
	return {
		btcPendingSentTransactionsStore: readable({})
	};
});

vi.mock('$btc/stores/fee-rate-percentiles.store', async () => {
	const { readable } = await import('svelte/store');
	return {
		feeRatePercentilesStore: readable(null)
	};
});

vi.mock('$lib/derived/address.derived', async () => {
	const { writable } = await import('svelte/store');
	return {
		ethAddress: writable('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
		btcAddressMainnet: writable(undefined)
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

	const mockBaseTokens: PayableToken[] = [
		{
			...ETHEREUM_TOKEN,
			amount: '0.01',
			minFee: 0.001,
			tokenNetwork: 'Ethereum'
		} as PayableToken
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
		} as PayableTokenWithFees
	];

	const mockOnOpenInfo = vi.fn();

	const renderWithContext = () =>
		render(ScannerCode, {
			props: {
				onNext: mockOnNext,
				onOpenInfo: mockOnOpenInfo
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

	// Create the isMobile spy once for the suite. clearAllMocks resets its call
	// history between tests but leaves the spy installed; restoreAllMocks at the
	// end puts the original implementation back. Per-test return values are set
	// via isMobileSpy.mockReturnValue(...) rather than re-spying.
	let isMobileSpy: MockInstance<typeof deviceUtils.isMobile>;

	beforeAll(() => {
		isMobileSpy = vi.spyOn(deviceUtils, 'isMobile');
	});

	beforeEach(() => {
		vi.clearAllMocks();

		isMobileSpy.mockReturnValue(true);
		// Default to a narrow viewport so the mobile bottom-sheet branch renders.
		// Tests covering the wide-viewport-mobile case override this explicitly.
		screensStore.set('xs');

		vi.mocked(openCryptoPayUtils.prepareBasePayableTokens).mockReturnValue(mockBaseTokens);
		vi.mocked(openCryptoPayServices.calculateTokensWithFees).mockResolvedValue(mockTokensWithFees);
	});

	afterAll(() => {
		vi.restoreAllMocks();
	});

	it('should render QR scanner', () => {
		const { container } = renderWithContext();

		expect(container.querySelector('[data-tid="address-book-qr-code-scan"]')).toBeInTheDocument();
	});

	it('should render enter manually button', () => {
		renderWithContext();

		expect(screen.getByTestId(OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON)).toBeInTheDocument();
	});

	describe('layout gate', () => {
		it('should render the inline input (not the bottom-sheet branch) on desktop', () => {
			isMobileSpy.mockReturnValue(false);

			renderWithContext();

			expect(screen.queryByTestId(OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON)).not.toBeInTheDocument();
			expect(screen.getByPlaceholderText(en.scanner.text.enter_or_paste_code)).toBeInTheDocument();
		});

		it('should render the inline input on a mobile device with a viewport >= lg', () => {
			// e.g. dev-tools mobile emulation at 1280px, or a landscape phablet -
			// the bottom sheet drops its `position: fixed` styling at >=1024px,
			// so we must fall back to the inline-input layout even when isMobile() is true.
			screensStore.set('xl');

			renderWithContext();

			expect(screen.queryByTestId(OPEN_CRYPTO_PAY_ENTER_MANUALLY_BUTTON)).not.toBeInTheDocument();
			expect(screen.getByPlaceholderText(en.scanner.text.enter_or_paste_code)).toBeInTheDocument();
		});
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
			expect(mockSetData).toHaveBeenCalledExactlyOnceWith(mockApiResponse);
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({ results: ScannerResults.PAY });
		});
	});

	it('should call onNext with WALLET_CONNECT result for wc: URIs', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: 'wc:abc123@2?relay-protocol=irn' } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({
				results: ScannerResults.WALLET_CONNECT,
				code: 'wc:abc123@2?relay-protocol=irn'
			});
		});

		expect(openCryptoPayServices.processOpenCryptoPayCode).not.toHaveBeenCalled();
	});

	it('should unwrap an OISY WalletConnect deep-link URL to its inner wc: URI', async () => {
		const walletConnectUri = 'wc:abc123@2?relay-protocol=irn&symKey=deadbeef';
		const deepLink = `https://${OISY_URL_HOSTNAME}/wc/?uri=${encodeURIComponent(walletConnectUri)}`;

		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: deepLink } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({
				results: ScannerResults.WALLET_CONNECT,
				code: walletConnectUri
			});
		});

		expect(openCryptoPayServices.processOpenCryptoPayCode).not.toHaveBeenCalled();
	});

	it('should show a domain-mismatch error for a wc deep-link URL on a non-OISY host', async () => {
		const walletConnectUri = 'wc:abc123@2?relay-protocol=irn';
		const deepLink = `https://evil.example/wc/?uri=${encodeURIComponent(walletConnectUri)}`;

		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: deepLink } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(screen.getByText(en.scanner.error.link_domain_mismatch)).toBeInTheDocument();
		});

		expect(mockOnNext).not.toHaveBeenCalledWith(
			expect.objectContaining({ results: ScannerResults.WALLET_CONNECT })
		);
		expect(openCryptoPayServices.processOpenCryptoPayCode).not.toHaveBeenCalled();
	});

	it('should call onNext with SOL_SEND result for a bare Solana address', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: mockSolAddress } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({
				results: ScannerResults.SOL_SEND,
				code: mockSolAddress
			});
		});

		expect(openCryptoPayServices.processOpenCryptoPayCode).not.toHaveBeenCalled();
	});

	it('should trim surrounding whitespace when forwarding a Solana address', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: `  ${mockSolAddress}  ` } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({
				results: ScannerResults.SOL_SEND,
				code: mockSolAddress
			});
		});
	});

	it('should not dispatch SOL_SEND for a solana: URI (falls through to OpenCryptoPay)', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		const solanaUri = `solana:${mockSolAddress}`;
		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: solanaUri } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(openCryptoPayServices.processOpenCryptoPayCode).toHaveBeenCalledExactlyOnceWith(
				solanaUri
			);
		});

		expect(mockOnNext).not.toHaveBeenCalledWith(
			expect.objectContaining({ results: ScannerResults.SOL_SEND })
		);
	});

	it('should not dispatch SOL_SEND for a bare address with query parameters (falls through to OpenCryptoPay)', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		const codeWithQuery = `${mockSolAddress}?amount=1`;
		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: codeWithQuery } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(openCryptoPayServices.processOpenCryptoPayCode).toHaveBeenCalledExactlyOnceWith(
				codeWithQuery
			);
		});

		expect(mockOnNext).not.toHaveBeenCalledWith(
			expect.objectContaining({ results: ScannerResults.SOL_SEND })
		);
	});

	it('should call onNext with BTC_SEND result for a bare BTC mainnet address', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: mockBtcAddress } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({
				results: ScannerResults.BTC_SEND,
				code: mockBtcAddress
			});
		});

		expect(openCryptoPayServices.processOpenCryptoPayCode).not.toHaveBeenCalled();
	});

	it('should trim surrounding whitespace when forwarding a BTC address', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: `  ${mockBtcAddress}  ` } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({
				results: ScannerResults.BTC_SEND,
				code: mockBtcAddress
			});
		});
	});

	it('should not dispatch BTC_SEND for a bitcoin: URI (falls through to OpenCryptoPay)', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		const bitcoinUri = `bitcoin:${mockBtcAddress}`;
		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: bitcoinUri } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(openCryptoPayServices.processOpenCryptoPayCode).toHaveBeenCalledExactlyOnceWith(
				bitcoinUri
			);
		});

		expect(mockOnNext).not.toHaveBeenCalledWith(
			expect.objectContaining({ results: ScannerResults.BTC_SEND })
		);
	});

	it('should not dispatch BTC_SEND for a BTC address with query parameters (falls through to OpenCryptoPay)', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		const codeWithQuery = `${mockBtcAddress}?amount=1`;
		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: codeWithQuery } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(openCryptoPayServices.processOpenCryptoPayCode).toHaveBeenCalledExactlyOnceWith(
				codeWithQuery
			);
		});

		expect(mockOnNext).not.toHaveBeenCalledWith(
			expect.objectContaining({ results: ScannerResults.BTC_SEND })
		);
	});

	it('should not dispatch BTC_SEND for whitespace-only input (falls through to OpenCryptoPay)', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		const whitespace = '   ';
		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: whitespace } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(openCryptoPayServices.processOpenCryptoPayCode).toHaveBeenCalledExactlyOnceWith(
				whitespace
			);
		});

		expect(mockOnNext).not.toHaveBeenCalledWith(
			expect.objectContaining({ results: ScannerResults.BTC_SEND })
		);
	});

	it('should call onNext with IC_SEND result for a bare IC principal', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: mockPrincipalText } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({
				results: ScannerResults.IC_SEND,
				code: mockPrincipalText
			});
		});

		expect(openCryptoPayServices.processOpenCryptoPayCode).not.toHaveBeenCalled();
	});

	it('should trim surrounding whitespace when forwarding an IC principal', async () => {
		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: `  ${mockPrincipalText}  ` } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({
				results: ScannerResults.IC_SEND,
				code: mockPrincipalText
			});
		});
	});

	it('should not dispatch IC_SEND for an ICRC account string with subaccount (falls through to OpenCryptoPay)', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

		renderWithContext();

		await openManualEntry();

		// A real encoded ICRC account string (principal + checksum + subaccount) is a
		// valid IC destination but not a bare principal — Principal.fromText rejects
		// it, so the scanner must fall through to OpenCryptoPay rather than
		// dispatching IC_SEND.
		const subaccount = new Uint8Array(32);
		subaccount[31] = 1;
		const icrcAccount = encodeIcrcAccount({ owner: mockPrincipal, subaccount });
		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: icrcAccount } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(openCryptoPayServices.processOpenCryptoPayCode).toHaveBeenCalledExactlyOnceWith(
				icrcAccount
			);
		});

		expect(mockOnNext).not.toHaveBeenCalledWith(
			expect.objectContaining({ results: ScannerResults.IC_SEND })
		);
	});

	it('should not treat non-wc: URIs as WalletConnect', async () => {
		vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);

		renderWithContext();

		await openManualEntry();

		const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
		await fireEvent.input(input, { target: { value: 'https://example.com/pay' } });

		const button = screen.getByRole('button', { name: en.core.text.continue });
		await fireEvent.click(button);

		await waitFor(() => {
			expect(openCryptoPayServices.processOpenCryptoPayCode).toHaveBeenCalledExactlyOnceWith(
				'https://example.com/pay'
			);
			expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({ results: ScannerResults.PAY });
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
				expect(openCryptoPayUtils.prepareBasePayableTokens).toHaveBeenCalledExactlyOnceWith({
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
				expect(openCryptoPayServices.calculateTokensWithFees).toHaveBeenCalledExactlyOnceWith(
					mockBaseTokens
				);
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
				expect(mockSetsetAvailableTokens).toHaveBeenCalledExactlyOnceWith(mockTokensWithFees);
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
				expect(mockSetsetAvailableTokens).toHaveBeenCalledExactlyOnceWith([]);
				expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({ results: ScannerResults.PAY });
			});
		});
	});

	describe('mobile error overlay', () => {
		it('should show overlay banner and not inline field error when processOpenCryptoPayCode rejects', async () => {
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockRejectedValue(new Error());

			const { container } = renderWithContext();

			await openManualEntry();

			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'invalid' } });

			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);

			await waitFor(() => {
				const matches = screen.getAllByText(en.scanner.error.code_link_is_not_valid);

				expect(matches).toHaveLength(1);
				expect(matches[0].tagName).toBe('DIV');
				expect(matches[0]).toHaveClass('text-error-primary');
			});

			const styledDiv = container.querySelector('[style*="--input-custom-border-color"]');

			expect(styledDiv?.getAttribute('style')).toContain('inherit');
		});
	});

	describe('waitReady for BTC data', () => {
		it('should call waitReady with correct parameters', async () => {
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);

			renderWithContext();
			await openManualEntry();

			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'valid-code' } });

			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);

			await waitFor(() => {
				expect(timeoutUtils.waitReady).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						retries: 20,
						isDisabled: expect.any(Function)
					})
				);
			});
		});

		it('should proceed successfully when waitReady returns timeout', async () => {
			vi.mocked(timeoutUtils.waitReady).mockResolvedValue('timeout');
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);

			renderWithContext();
			await openManualEntry();

			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'valid-code' } });

			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);

			await waitFor(() => {
				expect(mockSetData).toHaveBeenCalledExactlyOnceWith(mockApiResponse);
				expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({ results: ScannerResults.PAY });
			});
		});

		it('should proceed successfully when waitReady returns ready', async () => {
			vi.mocked(timeoutUtils.waitReady).mockResolvedValue('ready');
			vi.mocked(openCryptoPayServices.processOpenCryptoPayCode).mockResolvedValue(mockApiResponse);

			renderWithContext();
			await openManualEntry();

			const input = await screen.findByPlaceholderText(en.scanner.text.enter_or_paste_code);
			await fireEvent.input(input, { target: { value: 'valid-code' } });

			const button = screen.getByRole('button', { name: en.core.text.continue });
			await fireEvent.click(button);

			await waitFor(() => {
				expect(mockSetData).toHaveBeenCalledExactlyOnceWith(mockApiResponse);
				expect(mockOnNext).toHaveBeenCalledExactlyOnceWith({ results: ScannerResults.PAY });
			});
		});
	});
});
