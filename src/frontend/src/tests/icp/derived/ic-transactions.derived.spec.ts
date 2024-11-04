import {
	IC_CKETH_INDEX_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID,
	IC_CKETH_MINTER_CANISTER_ID
} from '$env/networks.icrc.env';
import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens.env';
import { icTransactions } from '$icp/derived/ic-transactions.derived';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcCkToken, IcTransactionUi } from '$icp/types/ic';
import { token } from '$lib/stores/token.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockCkBtcPendingUtxoTransaction } from '$tests/mocks/ckbtc.mock';
import { setupCkBTCStores } from '$tests/utils/ckbtc-stores.test-utils';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import { get } from 'svelte/store';

describe('ic-transactions.derived', () => {
	const transactions = [
		createCertifiedIcTransactionUiMock('tx1'),
		createCertifiedIcTransactionUiMock('tx2')
	];

	it('should return an empty array when all source stores are empty', () => {
		const result = get(icTransactions);
		expect(result).toEqual([]);
	});

	describe('with ic transactions only', () => {
		beforeEach(() => {
			token.set(ICP_TOKEN);
		});

		it('should derived ic transactions and ckBTC pending', () => {
			icTransactionsStore.append({
				tokenId: ICP_TOKEN_ID,
				transactions
			});

			const result = get(icTransactions);
			expect(result).toEqual([...transactions]);
		});
	});

	describe('with ckBTC pending data', () => {
		let tokenId: TokenId;

		beforeEach(() => {
			tokenId = setupCkBTCStores();
		});

		it('should derive only pending ckBTC', () => {
			const result = get(icTransactions);
			expect(result).toEqual([
				{
					data: mockCkBtcPendingUtxoTransaction,
					certified: false
				}
			]);
		});

		it('should derive ic transactions and ckBTC pending', () => {
			icTransactionsStore.append({
				tokenId,
				transactions
			});

			const result = get(icTransactions);
			expect(result).toEqual([
				{
					data: mockCkBtcPendingUtxoTransaction,
					certified: false
				},
				...transactions
			]);
		});
	});

	describe('with ckETH pending data', () => {
		const mockPendingCkEth: IcTransactionUi = {
			id: 'tx1',
			value: 100n,
			type: 'send',
			status: 'pending'
		};

		const tokenId: TokenId = parseTokenId('ckTest');

		beforeEach(() => {
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

		it('should derive only pending ckETH', () => {
			const result = get(icTransactions);
			expect(result).toEqual([
				{
					data: mockPendingCkEth,
					certified: true
				}
			]);
		});

		it('should derive ic transactions and ckETH pending', () => {
			icTransactionsStore.append({
				tokenId,
				transactions
			});

			const result = get(icTransactions);
			expect(result).toEqual([
				{
					data: mockPendingCkEth,
					certified: true
				},
				...transactions
			]);
		});
	});
});
