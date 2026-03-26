import type {
	EvmTransactionData,
	GetUserTransactionsResponse as CandidGetUserTransactionsResponse,
	NetworkTransactionData,
	TokenId,
	UserTransaction
} from '$declarations/backend/backend.did';
import { mapTransactionToUserTransaction } from '$eth/utils/user-transactions.utils';
import type { GetUserTransactionsResponse } from '$lib/types/api';
import type { Transaction } from '$lib/types/transaction';
import { mockEthTransaction } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

export { mockEthTransaction };

export const extractMockEvmTransactionData = (networkData: NetworkTransactionData): EvmTransactionData => {
	if (!('Evm' in networkData)) {
		throw new Error('Expected Evm network data');
	}

	return networkData.Evm;
};

export const mockEthMappedUserTransaction: UserTransaction =
	mapTransactionToUserTransaction(mockEthTransaction);

export const mockEthMappedEvmTransactionData: EvmTransactionData = extractMockEvmTransactionData(
	mockEthMappedUserTransaction.network_data
);

export const mockUserTransactionTokenId: TokenId = { Icrc: mockPrincipal };

export const createMockBackendUserTransaction = ({
	hash,
	blockIndex,
	timestamp,
	from = mockEthAddress
}: {
	hash: string;
	blockIndex: bigint;
	timestamp: bigint;
	from?: string;
}): UserTransaction => ({
	id: hash,
	block_index: blockIndex,
	timestamp,
	from,
	to: toNullable('0xrecipient'),
	value: 1000n,
	network_data: {
		Evm: {
			chain_id: toNullable(1n),
			nonce: toNullable(1n),
			gas_limit: toNullable(21000n),
			gas_price: toNullable(20_000_000_000n),
			gas_used: toNullable(21000n),
			data: toNullable(),
			nft_token_id: toNullable()
		}
	}
});

export const mockUserTransaction: UserTransaction = {
	id: 'tx-1',
	to: toNullable('0xabc'),
	block_index: 100n,
	value: 1000n,
	from: '0xdef',
	network_data: {
		Evm: {
			nft_token_id: toNullable(),
			data: toNullable(),
			chain_id: toNullable(1n),
			nonce: toNullable(42n),
			gas_limit: toNullable(),
			gas_used: toNullable(),
			gas_price: toNullable()
		}
	},
	timestamp: 1_000_000_000n
};

export const mockUserTransaction2: UserTransaction = {
	id: 'tx-2',
	to: toNullable(),
	block_index: 101n,
	value: 2000n,
	from: '0x123',
	network_data: {
		Evm: {
			nft_token_id: toNullable(),
			data: toNullable('0xdata'),
			chain_id: toNullable(1n),
			nonce: toNullable(43n),
			gas_limit: toNullable(21000n),
			gas_used: toNullable(21000n),
			gas_price: toNullable(20_000_000_000n)
		}
	},
	timestamp: 1_000_001_000n
};

export const mockCandidGetUserTransactionsResponse: CandidGetUserTransactionsResponse = {
	next_start: toNullable(15n),
	total_stored: 50n,
	oldest_block_index: toNullable(1n),
	newest_block_index: toNullable(100n),
	transactions: [mockUserTransaction]
};

export const mockGetUserTransactionsResponse: GetUserTransactionsResponse = {
	nextStart: 15n,
	totalStored: 50n,
	oldestBlockIndex: 1n,
	newestBlockIndex: 100n,
	transactions: [mockUserTransaction]
};

export const mockMapFromBackendUserTransaction = (tx: UserTransaction): Transaction => ({
	...mockEthTransaction,
	from: tx.from,
	blockNumber: Number(tx.block_index),
	hash: tx.id
});

export const mockMapToBackendUserTransaction = (_tx: Transaction): UserTransaction =>
	mockUserTransaction;
