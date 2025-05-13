import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { Transaction } from '$lib/types/transaction';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mocks';
import { bn1Bi, bn3Bi } from './balances.mock';

export const mockEthTransaction: Transaction = {
	blockNumber: 123213,
	nonce: 123,
	gasLimit: bn3Bi,
	chainId: 1n,
	from: mockEthAddress,
	timestamp: 123456789,
	to: mockEthAddress2,
	value: bn1Bi,
	hash: '0x123456789'
};

export const createMockEthTransactions = (n: number): Transaction[] =>
	Array.from({ length: n }, () => ({
		...mockEthTransaction,
		hash: Math.random().toString(36).substring(7)
	}));

export const createMockEthTransactionsUi = (n: number): EthTransactionUi[] =>
	Array.from({ length: n }, () => ({
		...mockEthTransaction,
		id: Math.random().toString(36).substring(7),
		hash: Math.random().toString(36).substring(7),
		type: 'send'
	}));
