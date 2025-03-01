import { sortedBtcTransactions } from '$btc/derived/btc-transactions.derived';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { BTC_MAINNET_TOKEN, BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { token } from '$lib/stores/token.store';
import { get } from 'svelte/store';

describe('btc-transactions.derived', () => {
	describe('sortedBtcTransactions', () => {
		const createMockTransaction = (id: string): BtcTransactionUi => ({
			id,
			timestamp: nowInBigIntNanoSeconds(),
			type: 'send',
			value: BigInt(100),
			from: 'sender',
			to: 'receiver',
			status: 'pending'
		});

		const tokenId = BTC_MAINNET_TOKEN_ID;

		beforeEach(() => {
			vi.useFakeTimers();

			token.set(BTC_MAINNET_TOKEN);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return sorted transactions', () => {
			const transaction1 = createMockTransaction('tx1');

			vi.advanceTimersByTime(1000);

			const transaction2 = createMockTransaction('tx2');

			vi.advanceTimersByTime(1000);

			const transaction3 = createMockTransaction('tx3');

			btcTransactionsStore.append({
				tokenId,
				transactions: [
					{
						data: transaction1,
						certified: true
					},
					{
						data: transaction2,
						certified: true
					},
					{
						data: transaction3,
						certified: true
					}
				]
			});

			const result = get(sortedBtcTransactions);

			expect(result).toHaveLength(3);
			expect(result[0].data.id).toBe(transaction3.id);
			expect(result[1].data.id).toBe(transaction2.id);
			expect(result[2].data.id).toBe(transaction1.id);
		});

		it('should return empty array when no transactions exist', () => {
			btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);

			const result = get(sortedBtcTransactions);

			expect(result).toEqual([]);
		});

		it('should return empty when transactions is set to nullish', () => {
			btcTransactionsStore.nullify(BTC_MAINNET_TOKEN_ID);

			const result = get(sortedBtcTransactions);

			expect(result).toEqual([]);
		});
	});
});
