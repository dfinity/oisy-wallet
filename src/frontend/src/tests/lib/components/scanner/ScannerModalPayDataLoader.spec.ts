import * as btcTokensDerived from '$btc/derived/tokens.derived';
import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import * as btcUtxosUtils from '$btc/utils/btc-utxos.utils';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import ScannerModalPayDataLoader from '$lib/components/scanner/ScannerModalPayDataLoader.svelte';
import * as addressDerived from '$lib/derived/address.derived';
import type { Token } from '$lib/types/token';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('ScannerModalPayDataLoader', () => {
	const mockEnabledMainnetBitcoinToken = (token?: Token) =>
		vi
			.spyOn(btcTokensDerived, 'enabledMainnetBitcoinToken', 'get')
			.mockImplementation(() => readable(token));

	const mockBtcAddressMainnet = (address?: string) =>
		vi
			.spyOn(addressDerived, 'btcAddressMainnet', 'get')
			.mockImplementation(() => readable(address));

	const mockResetUtxosDataStores = () =>
		vi.spyOn(btcUtxosUtils, 'resetUtxosDataStores').mockImplementation(() => {});

	const mockGetUtxosQuery = () =>
		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [mockUtxo],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});

	const mockLoadBtcPendingSentTransactions = () =>
		vi
			.spyOn(btcPendingSentTransactionsServices, 'loadBtcPendingSentTransactions')
			.mockResolvedValue({ success: true });

	const mockGetFeeRateFromPercentiles = () =>
		vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(5000n);

	const props = {
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();
		mockGetUtxosQuery();
		mockLoadBtcPendingSentTransactions();
		mockGetFeeRateFromPercentiles();
	});

	it('should render children directly when BTC mainnet token is not enabled', async () => {
		mockEnabledMainnetBitcoinToken();
		mockBtcAddressMainnet();

		const { getByTestId } = render(ScannerModalPayDataLoader, { props });

		await waitFor(() => {
			expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
		});
	});

	it('should render children with loaders when BTC mainnet token and address are available', async () => {
		mockEnabledMainnetBitcoinToken(BTC_MAINNET_TOKEN);
		mockBtcAddressMainnet(mockBtcAddress);

		const { getByTestId } = render(ScannerModalPayDataLoader, { props });

		await waitFor(() => {
			expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
		});
	});

	it('should call resetUtxosDataStores on destroy when BTC mainnet token and address are available', () => {
		mockEnabledMainnetBitcoinToken(BTC_MAINNET_TOKEN);
		mockBtcAddressMainnet(mockBtcAddress);
		const resetSpy = mockResetUtxosDataStores();

		const { unmount } = render(ScannerModalPayDataLoader, { props });

		expect(resetSpy).not.toHaveBeenCalled();

		unmount();

		expect(resetSpy).toHaveBeenCalledOnce();
	});

	it('should not call resetUtxosDataStores on destroy when BTC mainnet token is not enabled', () => {
		mockEnabledMainnetBitcoinToken();
		mockBtcAddressMainnet();
		const resetSpy = mockResetUtxosDataStores();

		const { unmount } = render(ScannerModalPayDataLoader, { props });

		unmount();

		expect(resetSpy).not.toHaveBeenCalled();
	});

	it('should not call resetUtxosDataStores on destroy when BTC mainnet token is enabled but address is undefined', () => {
		mockEnabledMainnetBitcoinToken(BTC_MAINNET_TOKEN);
		mockBtcAddressMainnet();
		const resetSpy = mockResetUtxosDataStores();

		const { unmount } = render(ScannerModalPayDataLoader, { props });

		unmount();

		expect(resetSpy).not.toHaveBeenCalled();
	});

	it('should render children directly when BTC mainnet token is enabled but address is undefined', async () => {
		mockEnabledMainnetBitcoinToken(BTC_MAINNET_TOKEN);
		mockBtcAddressMainnet();

		const { getByTestId } = render(ScannerModalPayDataLoader, { props });

		await waitFor(() => {
			expect(getByTestId(mockSnippetTestId)).toBeInTheDocument();
		});
	});
});
