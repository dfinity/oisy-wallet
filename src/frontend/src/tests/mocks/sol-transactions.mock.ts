import type { SolRpcTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { address } from '@solana/addresses';
import {
	blockhash,
	lamports,
	type Base58EncodedBytes,
	type UnixTimestamp
} from '@solana/rpc-types';

export const createMockSolTransactionUi = (id: string): SolTransactionUi => ({
	id,
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
	id: '4UjEjyVYfPNkr5TzZ3oH8ZS8PiEzbHsBdhvRtrLiuBfk8pQMRNvY3UUxjHe4nSzxAnhd8JCSQ3YYmAj651ZWeArM',
	meta: {
		computeUnitsConsumed: 150n,
		err: null,
		fee: lamports(5000n),
		innerInstructions: [],
		loadedAddresses: {
			readonly: [],
			writable: []
		},
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
			addressTableLookups: [],
			accountKeys: [
				address('devwuNsNYACyiEYxRNqMNseBpNnGfnd4ZwNHL7sphqv'),
				address(mockSolAddress),
				address('11111111111111111111111111111111')
			],
			header: {
				numReadonlySignedAccounts: 0,
				numReadonlyUnsignedAccounts: 1,
				numRequiredSignatures: 1
			},
			instructions: [
				{
					accounts: [0, 1],
					data: '3Bxs411qCLLRMUsZ' as Base58EncodedBytes,
					programIdIndex: 2,
					stackHeight: undefined
				}
			],
			recentBlockhash: blockhash('ARU13JbajMAevpuyAdaUEg2Fx4eb7H46wMqga2w5F6me')
		},
		signatures: [
			'4UjEjyVYfPNkr5TzZ3oH8ZS8PiEzbHsBdhvRtrLiuBfk8pQMRNvY3UUxjHe4nSzxAnhd8JCSQ3YYmAj651ZWeArM'
		] as Base58EncodedBytes[]
	},
	version: 'legacy'
};

export const mockSolRpcSendTransaction: SolRpcTransaction = {
	blockTime: 1736256974n as UnixTimestamp,
	confirmationStatus: 'finalized',
	id: '4xiJZFz8wVnFHhjNfLV2ZaGnFFkoJ1U2RcYhTFmyq8szGDNTvha2MtUhzPjqQwcNF9JqNwG4h5FVohFNWrqzrwVc',
	meta: {
		computeUnitsConsumed: 450n,
		err: null,
		fee: lamports(14900n),
		innerInstructions: [],
		loadedAddresses: {
			readonly: [],
			writable: []
		},
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
			addressTableLookups: [],
			accountKeys: [
				address(mockSolAddress),
				address('4DAtqyYPYCj2WK4RpPQwCNxz3xYLm5G9vTuZqnP2ZzcQ'),
				address('11111111111111111111111111111111'),
				address('ComputeBudget111111111111111111111111111111')
			],
			header: {
				numReadonlySignedAccounts: 0,
				numReadonlyUnsignedAccounts: 2,
				numRequiredSignatures: 1
			},
			instructions: [
				{
					accounts: [],
					data: '3DVGviTXKAPH' as Base58EncodedBytes,
					programIdIndex: 3,
					stackHeight: undefined
				},
				{
					accounts: [],
					data: 'LCQ37u' as Base58EncodedBytes,
					programIdIndex: 3,
					stackHeight: undefined
				},
				{
					accounts: [0, 1],
					data: '3Bxs4NQNnDSisSzK' as Base58EncodedBytes,
					programIdIndex: 2,
					stackHeight: undefined
				}
			],
			recentBlockhash: blockhash('Hz2ewskR9apeDBd9i38tYLATZgHujbjnp9AuRDSQuZB7')
		},
		signatures: [
			'4xiJZFz8wVnFHhjNfLV2ZaGnFFkoJ1U2RcYhTFmyq8szGDNTvha2MtUhzPjqQwcNF9JqNwG4h5FVohFNWrqzrwVc'
		] as Base58EncodedBytes[]
	},
	version: 'legacy'
};

export const mockSolRpcSendToMyselfTransaction: SolRpcTransaction = {
	blockTime: 1736329927n as UnixTimestamp,
	confirmationStatus: 'finalized',
	id: '2cg1qDf4swkfKiZDJTDGxHaiN2LBLLeVM7E87yLjUTpAcCp2rq8mxR2mtvjMU97JcmkiTE8QkB8vNWN1mtrTT2bc',
	meta: {
		computeUnitsConsumed: 450n,
		err: null,
		fee: lamports(14900n),
		innerInstructions: [],
		loadedAddresses: {
			readonly: [],
			writable: []
		},
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
			addressTableLookups: [],
			accountKeys: [
				address(mockSolAddress),
				address('11111111111111111111111111111111'),
				address('ComputeBudget111111111111111111111111111111')
			],
			header: {
				numReadonlySignedAccounts: 0,
				numReadonlyUnsignedAccounts: 2,
				numRequiredSignatures: 1
			},
			instructions: [
				{
					accounts: [],
					data: '3DVGviTXKAPH' as Base58EncodedBytes,
					programIdIndex: 2,
					stackHeight: undefined
				},
				{
					accounts: [],
					data: 'LCQ37u' as Base58EncodedBytes,
					programIdIndex: 2,
					stackHeight: undefined
				},
				{
					accounts: [0, 1],
					data: '3Bxs3zzLZLuLQEYX' as Base58EncodedBytes,
					programIdIndex: 1,
					stackHeight: undefined
				}
			],
			recentBlockhash: blockhash('Cp5CeDEfmtwQKKenDaiewY2wNuZJmEAJvSMV5kpFoFm3')
		},
		signatures: [
			'2cg1qDf4swkfKiZDJTDGxHaiN2LBLLeVM7E87yLjUTpAcCp2rq8mxR2mtvjMU97JcmkiTE8QkB8vNWN1mtrTT2bc'
		] as Base58EncodedBytes[]
	},
	version: 'legacy'
};
