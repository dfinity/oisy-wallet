import BtcPendingSentTransactionsLoader from '$btc/components/fee/BtcPendingSentTransactionsLoader.svelte';
import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('BtcPendingSentTransactionsLoader', () => {
	const networkId = BTC_MAINNET_NETWORK_ID;
	const source = mockBtcAddress;

	const mockLoadBtcPendingSentTransactions = () =>
		vi
			.spyOn(btcPendingSentTransactionsServices, 'loadBtcPendingSentTransactions')
			.mockResolvedValue({ success: true });

	const props = {
		source,
		networkId,
		children: mockSnippet
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
		btcPendingSentTransactionsStore.reset();
	});

	it('should call loadBtcPendingSentTransactions with proper params', async () => {
		const loadBtcPendingSentTransactionsSpy = mockLoadBtcPendingSentTransactions();

		mockAuthStore();

		render(BtcPendingSentTransactionsLoader, { props });

		await waitFor(() => {
			expect(loadBtcPendingSentTransactionsSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				networkId,
				address: source
			});
		});
	});

	it('should not call loadBtcPendingSentTransactions if store already has data for source', async () => {
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: source,
			pendingTransactions: []
		});

		const loadBtcPendingSentTransactionsSpy = mockLoadBtcPendingSentTransactions();

		mockAuthStore();

		render(BtcPendingSentTransactionsLoader, { props });

		await waitFor(() => {
			expect(loadBtcPendingSentTransactionsSpy).not.toHaveBeenCalled();
		});
	});

	it('should call loadBtcPendingSentTransactions for different source address', async () => {
		const differentSource = 'different-btc-address';
		btcPendingSentTransactionsStore.setPendingTransactions({
			address: differentSource,
			pendingTransactions: []
		});

		const loadBtcPendingSentTransactionsSpy = mockLoadBtcPendingSentTransactions();

		mockAuthStore();

		render(BtcPendingSentTransactionsLoader, { props });

		await waitFor(() => {
			expect(loadBtcPendingSentTransactionsSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				networkId,
				address: source
			});
		});
	});
});
