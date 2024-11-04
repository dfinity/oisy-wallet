import {
	IC_CKETH_INDEX_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID,
	IC_CKETH_MINTER_CANISTER_ID
} from '$env/networks.icrc.env';
import { icTransactions } from '$icp/derived/ic-transactions.derived';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import type { IcCkToken, IcTransactionUi } from '$icp/types/ic';
import { token } from '$lib/stores/token.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockCkBtcPendingUtxoTransaction } from '$tests/mocks/ckbtc.mock';
import { setupCkBTCStores } from '$tests/utils/ckbtc-stores.test-utils';
import { get } from 'svelte/store';

describe('ic-transactions.derived', () => {
	it('should return an empty array when all source stores are empty', () => {
		const result = get(icTransactions);
		expect(result).toEqual([]);
	});

	describe('with ckBtc pending data', () => {
		beforeEach(setupCkBTCStores);

		it('should derive ic transactions', () => {
			const result = get(icTransactions);
			expect(result).toEqual([
				{
					data: mockCkBtcPendingUtxoTransaction,
					certified: false
				}
			]);
		});
	});

	describe('with ckEth pending data', () => {
		const mockPendingCkEth: IcTransactionUi = {
			id: 'tx1',
			value: 100n,
			type: 'send',
			status: 'pending'
		};

		beforeEach(() => {
			const tokenId: TokenId = parseTokenId('ckTest');

			const mockToken: IcCkToken = {
				id: tokenId,
				standard: 'icrc',
				ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKETH_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKETH_MINTER_CANISTER_ID
			} as unknown as IcCkToken;

			token.set(mockToken);

			icPendingTransactionsStore.set({
				tokenId: mockToken.id,
				data: [
					{
						data: mockPendingCkEth,
						certified: true
					}
				]
			});
		});

		it('should derive ic transactions', () => {
			const result = get(icTransactions);
			expect(result).toEqual([
				{
					data: {
						id: `${mockPendingCkEth.id}`,
						status: mockPendingCkEth.status,
						type: mockPendingCkEth.type,
						value: mockPendingCkEth.value
					},
					certified: true
				}
			]);
		});
	});
});
