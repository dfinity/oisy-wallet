import { btcKnownDestinations, sortedBtcTransactions } from '$btc/derived/btc-transactions.derived';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { BTC_MAINNET_TOKEN, BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { token } from '$lib/stores/token.store';
import { get } from 'svelte/store';

describe('btc-transactions.derived', () => {
	const createMockTransaction = (id: string): BtcTransactionUi => ({
		id,
		timestamp: nowInBigIntNanoSeconds(),
		type: 'send',
		value: 100n,
		from: 'sender',
		to: ['receiver'],
		status: 'pending'
	});

	describe('sortedBtcTransactions', () => {
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

	describe('btcKnownDestinations', () => {
		const transactions = [
			{
				certified: true,
				data: createMockTransaction('tx1')
			},
			{
				certified: true,
				data: createMockTransaction('tx2')
			}
		];

		beforeEach(() => {
			token.set(BTC_MAINNET_TOKEN);
			btcTransactionsStore.reset(BTC_MAINNET_TOKEN_ID);
		});

		it('should return known destinations if transactions store has some data', () => {
			btcTransactionsStore.append({
				tokenId: BTC_MAINNET_TOKEN_ID,
				transactions
			});

			const maxTimestamp = Math.max(...transactions.map(({ data }) => Number(data.timestamp)));

			expect(get(btcKnownDestinations)).toEqual({
				[transactions[0].data.to?.[0] ?? '']: {
					amounts: transactions.map(({ data }) => ({
						value: data.value,
						token: BTC_MAINNET_TOKEN
					})),
					timestamp: maxTimestamp,
					address: transactions[0].data.to?.[0]
				}
			});
		});

		it('should return empty object if transactions store does not have data', () => {
			expect(get(btcKnownDestinations)).toEqual({});
		});
	});
});
