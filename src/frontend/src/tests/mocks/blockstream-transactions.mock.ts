import type { BtcTransactionUi } from '$btc/types/btc';
import { mapBtcTransaction } from '$btc/utils/blockstream-transactions.utils';
import { mockBlockstreamTransaction } from './blockstream.mock';
import { mockBtcAddress } from './btc.mock';

/**
 * Single mock BTC transaction UI - derived from Blockstream data
 */
export const mockBtcTransactionUi: BtcTransactionUi = mapBtcTransaction({
	transaction: mockBlockstreamTransaction,
	btcAddress: mockBtcAddress,
	latestBitcoinBlockHeight: 123313
});

/**
 * Re-export the raw Blockstream transaction for backward compatibility
 */
export const mockBtcTransaction = mockBlockstreamTransaction;

/**
 * Create multiple mock BTC transaction UI objects with variations
 */
export const createMockBtcTransactionsUi = (n: number): BtcTransactionUi[] =>
	Array.from({ length: n }, (_, index) => ({
		...mockBtcTransactionUi,
		id: `${index}${mockBtcTransactionUi.id.slice(1)}`,
		blockNumber: (mockBtcTransactionUi.blockNumber ?? 0) + index,
		timestamp: (mockBtcTransactionUi.timestamp ?? BigInt(0)) + BigInt(index * 100),
		value: mockBtcTransactionUi.value
			? mockBtcTransactionUi.value + BigInt(index * 1000)
			: undefined,
		confirmations: (mockBtcTransactionUi.confirmations ?? 0) - index
	}));
