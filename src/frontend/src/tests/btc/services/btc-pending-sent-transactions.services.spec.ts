import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import * as backendAPI from '$lib/api/backend.api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

describe('BTC Pending Sent Transactions Services', () => {
	const mockPendingTransaction: PendingTransaction = {
		txid: [],
		utxos: []
	};
	const address = 'test-address';

	beforeEach(() => {
		vi.clearAllMocks();
		btcPendingSentTransactionsStore.reset();
	});

	describe('loadBtcPendingSentTransactions', () => {
		it('should store the pending transactions', async () => {
			vi.spyOn(backendAPI, 'getPendingBtcTransactions').mockResolvedValue([mockPendingTransaction]);

			const result = await loadBtcPendingSentTransactions({
				address,
				identity: mockIdentity,
				networkId: BTC_MAINNET_NETWORK_ID
			});

			expect(result).toEqual({ success: true });
			expect(get(btcPendingSentTransactionsStore)[address].data).toEqual([mockPendingTransaction]);
		});

		it('should return an error if the identity is nullish', async () => {
			const result = await loadBtcPendingSentTransactions({
				address,
				identity: null,
				networkId: BTC_MAINNET_NETWORK_ID
			});

			expect(result).toEqual({ success: false, err: new Error('No internet identity.') });
			expect(get(btcPendingSentTransactionsStore)[address]).toBeUndefined();
		});

		it('should return an error if the network is not a Bitcoin network', async () => {
			const result = await loadBtcPendingSentTransactions({
				address,
				identity: mockIdentity,
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toEqual({
				success: false,
				err: new Error('Current network (Symbol(ETH)) is not a Bitcoin network.')
			});
			expect(get(btcPendingSentTransactionsStore)[address]).toBeUndefined();
		});

		it('should store `null` in the pending transactions if the api fails', async () => {
			const err = new Error('test');
			vi.spyOn(backendAPI, 'getPendingBtcTransactions').mockRejectedValue(err);

			const result = await loadBtcPendingSentTransactions({
				address,
				identity: mockIdentity,
				networkId: BTC_MAINNET_NETWORK_ID
			});

			expect(result).toEqual({ success: false, err });
			expect(get(btcPendingSentTransactionsStore)[address].data).toBeNull();
		});
	});
});
