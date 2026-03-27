import type {
	EtherscanProviderInternalTransaction,
	EtherscanProviderTransaction
} from '$eth/types/etherscan-transaction';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';

export const createMockEtherscanTransactions = (n: number): EtherscanProviderTransaction[] =>
	Array.from({ length: n }, (_, i) => ({
		blockNumber: (1000000 + i).toString(),
		timeStamp: (Math.floor(Date.now() / 1000) - i * 60).toString(),
		hash: Math.random().toString(36).substring(7),
		nonce: i.toString(),
		blockHash: Math.random().toString(36).substring(7),
		transactionIndex: i.toString(),
		from: mockEthAddress,
		to: mockEthAddress2,
		value: Math.floor(Math.random() * 10 ** 18).toString(),
		gas: '21000',
		gasPrice: 1_000_000_000_000n.toString(),
		isError: '0',
		txreceipt_status: '1',
		input: '0x',
		contractAddress: '',
		cumulativeGasUsed: '21000',
		gasUsed: '21000',
		confirmations: '1',
		methodId: '0x',
		functionName: ''
	}));

export const createMockEtherscanInternalTransactions = (
	n: number
): EtherscanProviderInternalTransaction[] =>
	Array.from({ length: n }, (_, i) => ({
		blockNumber: (1000000 + i).toString(),
		timeStamp: (Math.floor(Date.now() / 1000) - i * 60).toString(),
		hash: Math.random().toString(36).substring(7),
		from: mockEthAddress,
		to: mockEthAddress2,
		value: Math.floor(Math.random() * 10 ** 18).toString(),
		contractAddress: '',
		input: '0x',
		type: 'call',
		gas: '2300',
		gasUsed: '2300',
		traceId: i.toString(),
		isError: '0',
		errCode: ''
	}));
