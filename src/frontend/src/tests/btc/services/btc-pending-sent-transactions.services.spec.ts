import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import * as backendAPI from '$lib/api/backend.api';
import { mockUtxo } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { btcSendViaBackend } from '$tests/utils/btc-env.test-utils';
import { get } from 'svelte/store';

describe('BTC Pending Sent Transactions Services', () => {
	const mockPendingTransaction: PendingTransaction = {
		txid: Uint8Array.from([]),
		utxos: []
	};
	const address = 'test-address';

	beforeEach(() => {
		vi.clearAllMocks();
		btcPendingSentTransactionsStore.reset();
		allUtxosStore.reset();
	});

	describe('loadBtcPendingSentTransactions', () => {
		it('should store the pending transactions', async () => {
			const getPendingBtcTransactionsSpy = vi
				.spyOn(backendAPI, 'getPendingBtcTransactions')
				.mockResolvedValue({
					response: [mockPendingTransaction]
				});

			const result = await loadBtcPendingSentTransactions({
				address,
				identity: mockIdentity,
				networkId: BTC_MAINNET_NETWORK_ID
			});

			expect(result).toEqual({ success: true });
			expect(getPendingBtcTransactionsSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				network: { mainnet: null },
				iiDelegationChain: []
			});
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

		it('should not call the backend if the network is undefined', async () => {
			const getPendingBtcTransactionsSpy = vi.spyOn(backendAPI, 'getPendingBtcTransactions');

			const result = await loadBtcPendingSentTransactions({
				address,
				identity: mockIdentity,
				networkId: undefined
			});

			expect(result).toEqual({
				success: false,
				err: new Error('Current network (undefined) is not a Bitcoin network.')
			});
			expect(getPendingBtcTransactionsSpy).not.toHaveBeenCalled();
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
			expect(get(allUtxosStore)?.allUtxos).toBeUndefined();
		});

		describe('with BTC_SEND_VIA_BACKEND_ENABLED', () => {
			const spendableUtxos = {
				utxos: [mockUtxo],
				pending_transactions: [mockPendingTransaction]
			};

			beforeEach(() => {
				btcSendViaBackend.enabled = true;
			});

			it('should store the UTXOs and the pending transactions from one backend call', async () => {
				const getSpendableBtcUtxosSpy = vi
					.spyOn(backendAPI, 'getSpendableBtcUtxos')
					.mockResolvedValue(spendableUtxos);
				const getPendingBtcTransactionsSpy = vi.spyOn(backendAPI, 'getPendingBtcTransactions');

				const result = await loadBtcPendingSentTransactions({
					address,
					identity: mockIdentity,
					networkId: BTC_MAINNET_NETWORK_ID
				});

				expect(result).toEqual({ success: true });
				expect(getSpendableBtcUtxosSpy).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					network: { mainnet: null },
					iiDelegationChain: []
				});
				expect(getPendingBtcTransactionsSpy).not.toHaveBeenCalled();
				expect(get(allUtxosStore)?.allUtxos).toEqual([mockUtxo]);
				expect(get(btcPendingSentTransactionsStore)[address].data).toEqual([
					mockPendingTransaction
				]);
			});

			it('should store no UTXOs and `null` pending transactions if the first load fails', async () => {
				const err = new Error('test');
				vi.spyOn(backendAPI, 'getSpendableBtcUtxos').mockRejectedValue(err);

				const result = await loadBtcPendingSentTransactions({
					address,
					identity: mockIdentity,
					networkId: BTC_MAINNET_NETWORK_ID
				});

				expect(result).toEqual({ success: false, err });
				expect(get(btcPendingSentTransactionsStore)[address].data).toBeNull();
				expect(get(allUtxosStore)?.allUtxos).toEqual([]);
			});

			it('should keep the UTXOs already loaded if a reload fails', async () => {
				allUtxosStore.setAllUtxos({ allUtxos: [mockUtxo] });
				vi.spyOn(backendAPI, 'getSpendableBtcUtxos').mockRejectedValue(new Error('test'));

				await loadBtcPendingSentTransactions({
					address,
					identity: mockIdentity,
					networkId: BTC_MAINNET_NETWORK_ID
				});

				expect(get(btcPendingSentTransactionsStore)[address].data).toBeNull();
				expect(get(allUtxosStore)?.allUtxos).toEqual([mockUtxo]);
			});
		});
	});
});
