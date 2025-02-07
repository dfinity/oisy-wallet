import {
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolCertifiedTransaction } from '$sol/stores/sol-transactions.store';
import type { SolTransactionMessage } from '$sol/types/sol-send';
import type {
	SolRpcTransaction,
	SolSignedTransaction,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { address } from '@solana/addresses';
import { signature } from '@solana/keys';
import {
	blockhash,
	lamports,
	type Base58EncodedBytes,
	type Blockhash,
	type UnixTimestamp
} from '@solana/rpc-types';
import type { TransactionMessageBytes } from '@solana/transactions';

const mockSignature =
	'4UjEjyVYfPNkr5TzZ3oH8ZS8PiEzbHsBdhvRtrLiuBfk8pQMRNvY3UUxjHe4nSzxAnhd8JCSQ3YYmAj651ZWeArM';
const mockSignature2 =
	'4xiJZFz8wVnFHhjNfLV2ZaGnFFkoJ1U2RcYhTFmyq8szGDNTvha2MtUhzPjqQwcNF9JqNwG4h5FVohFNWrqzrwVc';
const mockSignature3 =
	'2cg1qDf4swkfKiZDJTDGxHaiN2LBLLeVM7E87yLjUTpAcCp2rq8mxR2mtvjMU97JcmkiTE8QkB8vNWN1mtrTT2bc';

export const createMockSolTransactionsUi = (n: number): SolTransactionUi[] =>
	Array.from({ length: n }, () => createMockSolTransactionUi(`txn-${n}`));

export const createMockSolTransactionUi = (id: string): SolTransactionUi => ({
	id,
	signature: signature(mockSignature),
	timestamp: 0n,
	type: 'send',
	value: BigInt(100),
	from: 'sender',
	to: 'receiver',
	status: 'finalized'
});

export const mockSolRpcReceiveTransaction: SolRpcTransaction = {
	blockTime: 1736257946n as UnixTimestamp,
	confirmationStatus: 'finalized',
	id: mockSignature,
	signature: signature(mockSignature),
	meta: {
		computeUnitsConsumed: 150n,
		err: null,
		fee: lamports(5000n),
		innerInstructions: [],
		logMessages: [
			'Program 11111111111111111111111111111111 invoke [1]',
			'Program 11111111111111111111111111111111 success'
		],
		postBalances: [lamports(14808188293851n), lamports(5849985100n), lamports(1n)],
		postTokenBalances: [],
		preBalances: [lamports(14813188298851n), lamports(849985100n), lamports(1n)],
		preTokenBalances: [],
		rewards: [],
		status: {
			Ok: null
		}
	},
	slot: 352454651n,
	transaction: {
		message: {
			accountKeys: [
				{
					pubkey: address('devwuNsNYACyiEYxRNqMNseBpNnGfnd4ZwNHL7sphqv'),
					signer: false,
					source: 'program',
					writable: false
				},
				{
					pubkey: address(mockSolAddress),
					signer: true,
					source: 'external',
					writable: true
				},
				{
					pubkey: address(SYSTEM_PROGRAM_ADDRESS),
					signer: false,
					source: 'program',
					writable: false
				}
			],
			instructions: [
				{
					accounts: [
						address('devwuNsNYACyiEYxRNqMNseBpNnGfnd4ZwNHL7sphqv'),
						address(mockSolAddress)
					],
					data: '3Bxs411qCLLRMUsZ' as Base58EncodedBytes,
					programId: address(SYSTEM_PROGRAM_ADDRESS),
					stackHeight: undefined
				}
			],
			recentBlockhash: blockhash('ARU13JbajMAevpuyAdaUEg2Fx4eb7H46wMqga2w5F6me')
		},
		signatures: [mockSignature] as Base58EncodedBytes[]
	},
	version: 'legacy'
};

export const mockSolRpcSendTransaction: SolRpcTransaction = {
	blockTime: 1736256974n as UnixTimestamp,
	confirmationStatus: 'finalized',
	id: mockSignature2,
	signature: signature(mockSignature2),
	meta: {
		computeUnitsConsumed: 450n,
		err: null,
		fee: lamports(14900n),
		innerInstructions: [],
		logMessages: [
			'Program ComputeBudget111111111111111111111111111111 invoke [1]',
			'Program ComputeBudget111111111111111111111111111111 success',
			'Program ComputeBudget111111111111111111111111111111 invoke [1]',
			'Program ComputeBudget111111111111111111111111111111 success',
			'Program 11111111111111111111111111111111 invoke [1]',
			'Program 11111111111111111111111111111111 success'
		],
		postBalances: [lamports(849985100n), lamports(150000000n), lamports(1n), lamports(1n)],
		postTokenBalances: [],
		preBalances: [lamports(1000000000n), lamports(0n), lamports(1n), lamports(1n)],
		preTokenBalances: [],
		rewards: [],
		status: {
			Ok: null
		}
	},
	slot: 352452048n,
	transaction: {
		message: {
			accountKeys: [
				{
					pubkey: address(mockSolAddress),
					signer: true,
					source: 'external',
					writable: true
				},
				{
					pubkey: address('4DAtqyYPYCj2WK4RpPQwCNxz3xYLm5G9vTuZqnP2ZzcQ'),
					signer: false,
					source: 'external',
					writable: true
				},
				{
					pubkey: address(SYSTEM_PROGRAM_ADDRESS),
					signer: false,
					source: 'program',
					writable: false
				},
				{
					pubkey: address(COMPUTE_BUDGET_PROGRAM_ADDRESS),
					signer: false,
					source: 'program',
					writable: false
				}
			],
			instructions: [
				{
					accounts: [],
					data: '3DVGviTXKAPH' as Base58EncodedBytes,
					programId: address(COMPUTE_BUDGET_PROGRAM_ADDRESS),
					stackHeight: undefined
				},
				{
					accounts: [],
					data: 'LCQ37u' as Base58EncodedBytes,
					programId: address(COMPUTE_BUDGET_PROGRAM_ADDRESS),
					stackHeight: undefined
				},
				{
					accounts: [
						address(mockSolAddress),
						address('4DAtqyYPYCj2WK4RpPQwCNxz3xYLm5G9vTuZqnP2ZzcQ')
					],
					data: '3Bxs4NQNnDSisSzK' as Base58EncodedBytes,
					programId: address(SYSTEM_PROGRAM_ADDRESS),
					stackHeight: undefined
				}
			],
			recentBlockhash: blockhash('Hz2ewskR9apeDBd9i38tYLATZgHujbjnp9AuRDSQuZB7')
		},
		signatures: [mockSignature2] as Base58EncodedBytes[]
	},
	version: 'legacy'
};

export const mockSolRpcSendToMyselfTransaction: SolRpcTransaction = {
	blockTime: 1736329927n as UnixTimestamp,
	confirmationStatus: 'finalized',
	id: mockSignature3,
	signature: signature(mockSignature3),
	meta: {
		computeUnitsConsumed: 450n,
		err: null,
		fee: lamports(14900n),
		innerInstructions: [],
		logMessages: [
			'Program ComputeBudget111111111111111111111111111111 invoke [1]',
			'Program ComputeBudget111111111111111111111111111111 success',
			'Program ComputeBudget111111111111111111111111111111 invoke [1]',
			'Program ComputeBudget111111111111111111111111111111 success',
			'Program 11111111111111111111111111111111 invoke [1]',
			'Program 11111111111111111111111111111111 success'
		],
		postBalances: [lamports(4843782320n), lamports(1n), lamports(1n)],
		postTokenBalances: [],
		preBalances: [lamports(4843797220n), lamports(1n), lamports(1n)],
		preTokenBalances: [],
		rewards: [],
		status: {
			Ok: null
		}
	},
	slot: 352647164n,
	transaction: {
		message: {
			accountKeys: [
				{
					pubkey: address(mockSolAddress),
					signer: true,
					source: 'external',
					writable: true
				},
				{
					pubkey: address(SYSTEM_PROGRAM_ADDRESS),
					signer: false,
					source: 'program',
					writable: false
				},
				{
					pubkey: address(COMPUTE_BUDGET_PROGRAM_ADDRESS),
					signer: false,
					source: 'program',
					writable: false
				}
			],
			instructions: [
				{
					accounts: [],
					data: '3DVGviTXKAPH' as Base58EncodedBytes,
					programId: address(COMPUTE_BUDGET_PROGRAM_ADDRESS),
					stackHeight: undefined
				},
				{
					accounts: [],
					data: 'LCQ37u' as Base58EncodedBytes,
					programId: address(COMPUTE_BUDGET_PROGRAM_ADDRESS),
					stackHeight: undefined
				},
				{
					accounts: [address(mockSolAddress), address(SYSTEM_PROGRAM_ADDRESS)],
					data: '3Bxs3zzLZLuLQEYX' as Base58EncodedBytes,
					programId: address(SYSTEM_PROGRAM_ADDRESS),
					stackHeight: undefined
				}
			],
			recentBlockhash: blockhash('Cp5CeDEfmtwQKKenDaiewY2wNuZJmEAJvSMV5kpFoFm3')
		},
		signatures: [mockSignature3] as Base58EncodedBytes[]
	},
	version: 'legacy'
};

export const mockSolCertifiedTransactions: SolCertifiedTransaction[] = [
	{
		data: mapSolTransactionUi({
			transaction: mockSolRpcReceiveTransaction,
			address: mockSolAddress
		}),
		certified: false
	},
	{
		data: mapSolTransactionUi({ transaction: mockSolRpcSendTransaction, address: mockSolAddress }),
		certified: false
	}
];

export const mockSolTransactionMessage: SolTransactionMessage = {
	lifetimeConstraint: {
		blockhash: 'mock-blockhash' as Blockhash,
		lastValidBlockHeight: 1000n
	},
	feePayer: { address: address(mockSolAddress) },
	version: 'legacy',
	instructions: [
		{
			accounts: [
				{
					address: address(mockSolAddress),
					role: 3
				},
				{
					address: address(mockSolAddress2),
					role: 1
				}
			],
			data: Uint8Array.from([1, 2, 3]),
			programAddress: address(TOKEN_PROGRAM_ADDRESS)
		}
	]
};

export const mockSolSignedTransaction: SolSignedTransaction = {
	messageBytes: Uint8Array.from([1, 2, 3, 4, 5, 6]) as unknown as TransactionMessageBytes,
	signatures: Uint8Array.from([9, 8, 7, 6, 5, 4, 3, 2, 1])
} as unknown as SolSignedTransaction;
