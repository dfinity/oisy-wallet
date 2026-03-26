import type {
	GetUserTransactionsResponse as CandidGetUserTransactionsResponse,
	TokenId,
	UserTransaction
} from '$declarations/backend/backend.did';
import type { GetUserTransactionsResponse } from '$lib/types/api';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

export const mockUserTransactionTokenId: TokenId = { Icrc: mockPrincipal };

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
