import type { Transaction } from '$lib/types/transaction';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mocks';
import { BigNumber } from 'ethers';
import { bn1Bi, bn3Bi } from './balances.mock';

export const mockEthTransactionUi: Transaction = {
	blockNumber: 123213,
	nonce: 123,
	gasPrice: bn1Bi,
	gasLimit: bn3Bi,
	maxPriorityFeePerGas: null,
	maxFeePerGas: null,
	type: 1,
	chainId: 1n,
	from: mockEthAddress,
	timestamp: 123456789,
	to: mockEthAddress2,
	value: bn1Bi,
	hash: '0x123456789'
};

export const createMockEthTransactions = (n: number): Transaction[] =>
	Array.from({ length: n }, () => ({
		...mockEthTransactionUi,
		hash: Math.random().toString(36).substring(7)
	}));
