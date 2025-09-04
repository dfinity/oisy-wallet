import { ZERO } from '$lib/constants/app.constants';
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
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import {
	address,
	blockhash,
	lamports,
	signature,
	stringifiedBigInt,
	stringifiedNumber,
	type Base58EncodedBytes,
	type Blockhash,
	type CompilableTransactionMessage,
	type TransactionMessageBytes,
	type UnixTimestamp
} from '@solana/kit';

const mockSignature =
	'4UjEjyVYfPNkr5TzZ3oH8ZS8PiEzbHsBdhvRtrLiuBfk8pQMRNvY3UUxjHe4nSzxAnhd8JCSQ3YYmAj651ZWeArM';
const mockSignature2 =
	'4xiJZFz8wVnFHhjNfLV2ZaGnFFkoJ1U2RcYhTFmyq8szGDNTvha2MtUhzPjqQwcNF9JqNwG4h5FVohFNWrqzrwVc';

export const createMockSolTransactionsUi = (n: number): SolTransactionUi[] =>
	Array.from({ length: n }, () => createMockSolTransactionUi(`txn-${n}`));

export const createMockSolTransactionUi = (id: string): SolTransactionUi => ({
	id,
	signature: signature(mockSignature),
	timestamp: ZERO,
	type: 'send',
	value: 100n,
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
					source: 'lookupTable',
					writable: false
				},
				{
					pubkey: address(mockSolAddress),
					signer: true,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address(SYSTEM_PROGRAM_ADDRESS),
					signer: false,
					source: 'lookupTable',
					writable: false
				}
			],
			addressTableLookups: [
				{
					accountKey: address('8GU6nusbxwVrwkAkcQCnLfJj1cE4sGH5xCLmss5WEuP4'),
					readonlyIndexes: [146],
					writableIndexes: [148, 149, 156, 152]
				},
				{
					accountKey: address('9W6BH3BLditrazBMnT87jc5ZdKRLtUFmWqkLviWtdzXm'),
					readonlyIndexes: [69, 67, 10, 70, 68, 73],
					writableIndexes: [66, 63, 71, 72]
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
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('4DAtqyYPYCj2WK4RpPQwCNxz3xYLm5G9vTuZqnP2ZzcQ'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address(SYSTEM_PROGRAM_ADDRESS),
					signer: false,
					source: 'lookupTable',
					writable: false
				},
				{
					pubkey: address(COMPUTE_BUDGET_PROGRAM_ADDRESS),
					signer: false,
					source: 'lookupTable',
					writable: false
				}
			],
			addressTableLookups: [
				{
					accountKey: address('8GU6nusbxwVrwkAkcQCnLfJj1cE4sGH5xCLmss5WEuP4'),
					readonlyIndexes: [146],
					writableIndexes: [148, 149, 156, 152]
				},
				{
					accountKey: address('9W6BH3BLditrazBMnT87jc5ZdKRLtUFmWqkLviWtdzXm'),
					readonlyIndexes: [69, 67, 10, 70, 68, 73],
					writableIndexes: [66, 63, 71, 72]
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

export const mockSolTransactionDetail: SolRpcTransaction = {
	blockTime: 1740654097n as UnixTimestamp,
	meta: {
		computeUnitsConsumed: 208718n,
		err: null,
		fee: lamports(1879240n),
		innerInstructions: [
			{
				index: 3,
				instructions: [
					{
						parsed: {
							info: {
								account: address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3'),
								space: '165'
							},
							type: 'allocate'
						},
						program: 'system',
						programId: address('11111111111111111111111111111111'),
						stackHeight: 2
					},
					{
						parsed: {
							info: {
								account: address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3'),
								owner: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
							},
							type: 'assign'
						},
						program: 'system',
						programId: address('11111111111111111111111111111111'),
						stackHeight: 2
					},
					{
						parsed: {
							info: {
								account: address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3'),
								mint: address('So11111111111111111111111111111111111111112'),
								owner: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1')
							},
							type: 'initializeAccount3'
						},
						program: 'spl-token',
						programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						stackHeight: 2
					}
				]
			},
			{
				index: 4,
				instructions: [
					{
						parsed: {
							info: {
								amount: '500',
								authority: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1'),
								destination: address('6zAcFYmxkaH25qWZW5ek4dk4SyQNpSza3ydSoUxjTudD'),
								source: address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3')
							},
							type: 'transfer'
						},
						program: 'spl-token',
						programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						stackHeight: 2
					},
					{
						accounts: [address('D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf')],
						data: '2qWhKzSZDTHhTkHUC1NYnThFP9ELuyJ96rmZrgSYsEaZHjW1cAj2W8dwmZphbpM1VZu5M46PR9cZNSVQpWdLZMX7r2HHhy6ppvcc2qeGvZ1uQw7uyQbxXNh99' as Base58EncodedBytes,
						programId: address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
						stackHeight: 2
					},
					{
						parsed: {
							info: {
								amount: '999500',
								authority: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1'),
								destination: address('8ctcHN52LY21FEipCjr1MVWtoZa1irJQTPyAaTj72h7S'),
								source: address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3')
							},
							type: 'transfer'
						},
						program: 'spl-token',
						programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						stackHeight: 2
					},
					{
						accounts: [
							address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
							address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
							address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
							address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
							address('B6LL9aCWVuo1tTcJoYvCTDqYrq1vjMfci8uHxsm4UxTR'),
							address('So11111111111111111111111111111111111111112'),
							address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
							address('8ctcHN52LY21FEipCjr1MVWtoZa1irJQTPyAaTj72h7S'),
							address('5PAmrLHaPnH95QqiCQ5x9Hn5MPGQZmQhKuL1kyS24r7G'),
							address('6pXVFSACE5BND2C3ibGRWMG1fNtV7hfynWrfNKtCXhN3'),
							address('vZ7uh4khfcUHKyc1dyaDhg21jDH5p5q4Pugr3R4v4Mp'),
							address('73aLfp1JxetJ6UyjQRTjkedeAUJeT65qHmDUrPtij4jb'),
							address('9BcKSr2ETBFcfQN5GvdgfqKsrfhR4jP7ayZNgokBNhqn'),
							address('8Nm8YTgGPaHBGwZ3neR1LquSjr637j3rE7PPjJeMkzE9'),
							address('F9Gj6DfjfoueaWHZsDMASx19RHYebXqsoEUx4hgWrZnE')
						],
						data: '4AoQRYXBdnCEHw11bhoYwvUhoNqgiUuU3FXvPfVKupsZ51KnDTyPy4GMQkP' as Base58EncodedBytes,
						programId: address('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
						stackHeight: 2
					},
					{
						parsed: {
							info: {
								authority: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
								destination: address('5PAmrLHaPnH95QqiCQ5x9Hn5MPGQZmQhKuL1kyS24r7G'),
								mint: address('So11111111111111111111111111111111111111112'),
								source: address('8ctcHN52LY21FEipCjr1MVWtoZa1irJQTPyAaTj72h7S'),
								tokenAmount: {
									amount: '999500',
									decimals: '9',
									uiAmount: 0.0009995,
									uiAmountString: '0.0009995'
								}
							},
							type: 'transferChecked'
						},
						program: 'spl-token',
						programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						stackHeight: 3
					},
					{
						parsed: {
							info: {
								authority: address('B6LL9aCWVuo1tTcJoYvCTDqYrq1vjMfci8uHxsm4UxTR'),
								destination: address('6pXVFSACE5BND2C3ibGRWMG1fNtV7hfynWrfNKtCXhN3'),
								mint: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
								source: address('vZ7uh4khfcUHKyc1dyaDhg21jDH5p5q4Pugr3R4v4Mp'),
								tokenAmount: {
									amount: '141954',
									decimals: '6',
									uiAmount: 0.141954,
									uiAmountString: '0.141954'
								}
							},
							type: 'transferChecked'
						},
						program: 'spl-token',
						programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						stackHeight: 3
					},
					{
						accounts: [address('D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf')],
						data: 'QMqFu4fYGGeUEysFnenhAvDWgqp1W7DbrMv3z8JcyrP4Bu3Yyyj7irLW76wEzMiFqiFwoETYwdqiPRSaEKSWpjDuenVF1jJfDrxNf9W2BiSt1fDczktmqEfD2H9RZEqWA8cfeJQn87R1AAtACVGRT31v9j9oVXSThjvNYXxpWUVWd5Z' as Base58EncodedBytes,
						programId: address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
						stackHeight: 2
					},
					{
						accounts: [
							address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
							address('6pXVFSACE5BND2C3ibGRWMG1fNtV7hfynWrfNKtCXhN3'),
							address('7u7cD7NxcZEuzRCBaYo8uVpotRdqZwez47vvuwzCov43'),
							address('95QUtvDkuoDZrNJiuh9MdahkpRNtSVhZRe83oepd8AM7'),
							address('AioJRQXvcDLRhHMd6DAkTbbMpgVx63qSGQYmRBS2vHYA'),
							address('ArLSJrSstZ3kjeZDyMAgjfjad1qdRZHHYaCQTQeAcTpa'),
							address('4Lh8hhxS1vY2F3h1eJGuxP18GWGn8V7xeQHqgsL98fVR'),
							address('8BSWYgAczR36C7ukr32v7uTepoRhYJYxAVnpBtYniZTm'),
							address('stab1io8dHvK26KoHmTwwHyYmHRbUWbyEJx6CdrGabC'),
							address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
							address('vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV'),
							address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
						],
						data: '2j6vnwYDURn8zkBjzqfkdDJmwUFjEC6ghg3' as Base58EncodedBytes,
						programId: address('swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ'),
						stackHeight: 2
					},
					{
						parsed: {
							info: {
								amount: '141954',
								authority: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
								destination: address('95QUtvDkuoDZrNJiuh9MdahkpRNtSVhZRe83oepd8AM7'),
								source: address('6pXVFSACE5BND2C3ibGRWMG1fNtV7hfynWrfNKtCXhN3')
							},
							type: 'transfer'
						},
						program: 'spl-token',
						programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						stackHeight: 3
					},
					{
						accounts: [
							address('8BSWYgAczR36C7ukr32v7uTepoRhYJYxAVnpBtYniZTm'),
							address('stab1io8dHvK26KoHmTwwHyYmHRbUWbyEJx6CdrGabC'),
							address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
							address('AioJRQXvcDLRhHMd6DAkTbbMpgVx63qSGQYmRBS2vHYA'),
							address('7u7cD7NxcZEuzRCBaYo8uVpotRdqZwez47vvuwzCov43'),
							address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
						],
						data: 'HgzYw38kQ5mws4QMYWcCmxRHMckbHEXhq' as Base58EncodedBytes,
						programId: address('vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV'),
						stackHeight: 3
					},
					{
						parsed: {
							info: {
								amount: '141832',
								authority: address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
								destination: address('7u7cD7NxcZEuzRCBaYo8uVpotRdqZwez47vvuwzCov43'),
								source: address('AioJRQXvcDLRhHMd6DAkTbbMpgVx63qSGQYmRBS2vHYA')
							},
							type: 'transfer'
						},
						program: 'spl-token',
						programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						stackHeight: 4
					},
					{
						accounts: [address('D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf')],
						data: 'QMqFu4fYGGeUEysFnenhAvDLCKNcZ6RVNL1ETZ4Md2NKwNjTVbTMrb5rrjFMYcRVpJtjXS26mHiK1M2qDsub1uHjg8Hrrn5WLTJhZQAdDL54r4wm9cMNYUeJ3xiW3AVErV148hTNePSvetCHuUUVoy8ENUjsmkMTEQRYNGpCrXPXvcF' as Base58EncodedBytes,
						programId: address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
						stackHeight: 2
					},
					{
						parsed: {
							info: {
								amount: '141832',
								authority: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
								destination: address('7xSNhASWK77oZtPyVQf1HFUXU1xxXjqkpkxVTULBmcMD'),
								source: address('7u7cD7NxcZEuzRCBaYo8uVpotRdqZwez47vvuwzCov43')
							},
							type: 'transfer'
						},
						program: 'spl-token',
						programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						stackHeight: 2
					}
				]
			}
		],
		logMessages: [
			'Program ComputeBudget111111111111111111111111111111 invoke [1]',
			'Program ComputeBudget111111111111111111111111111111 success',
			'Program ComputeBudget111111111111111111111111111111 invoke [1]',
			'Program ComputeBudget111111111111111111111111111111 success',
			'Program 11111111111111111111111111111111 invoke [1]',
			'Program 11111111111111111111111111111111 success',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [1]',
			'Program log: Instruction: CreateTokenAccount',
			'Program 11111111111111111111111111111111 invoke [2]',
			'Program 11111111111111111111111111111111 success',
			'Program 11111111111111111111111111111111 invoke [2]',
			'Program 11111111111111111111111111111111 success',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
			'Program log: Instruction: InitializeAccount3',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 3158 of 254463 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 consumed 7908 of 259186 compute units',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 success',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [1]',
			'Program log: Instruction: SharedAccountsRoute',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
			'Program log: Instruction: Transfer',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4735 of 247020 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [2]',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 consumed 184 of 240774 compute units',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 success',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
			'Program log: Instruction: Transfer',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4735 of 239333 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc invoke [2]',
			'Program log: Instruction: SwapV2',
			'Program log: fee_growth: 144680605896',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [3]',
			'Program log: Instruction: TransferChecked',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 6238 of 181049 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [3]',
			'Program log: Instruction: TransferChecked',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 6200 of 170849 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc consumed 68538 of 230333 compute units',
			'Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc success',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [2]',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 consumed 184 of 160042 compute units',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 success',
			'Program swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ invoke [2]',
			'Program log: Instruction: Swap',
			'Program data: rFJyzxtn0wQxnnl1B9xQwrwinS+UYmEp62l5MTW6ACOlWU8RrBKqQAIAAADIAYQlihsAAEiU5NOwoAAA',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [3]',
			'Program log: Instruction: Transfer',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 87494 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV invoke [3]',
			'Program log: Instruction: Withdraw',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [4]',
			'Program log: Instruction: Transfer',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 70400 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV consumed 12771 of 78279 compute units',
			'Program vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV success',
			'Program swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ consumed 93217 of 156823 compute units',
			'Program swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ success',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 invoke [2]',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 consumed 184 of 61872 compute units',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 success',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
			'Program log: Instruction: Transfer',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 58760 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 consumed 197295 of 251278 compute units',
			'Program return: JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 CCoCAAAAAAA=',
			'Program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 success',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
			'Program log: Instruction: CloseAccount',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 2915 of 53983 compute units',
			'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success',
			'Program 11111111111111111111111111111111 invoke [1]',
			'Program 11111111111111111111111111111111 success'
		],
		postBalances: [
			lamports(6877342n),
			lamports(2040080n),
			lamports(1031792087n),
			lamports(70407360n),
			lamports(2039580n),
			lamports(2039280n),
			lamports(1288266307n),
			lamports(70407360n),
			lamports(70407360n),
			lamports(0n),
			lamports(5201719951n),
			lamports(1n),
			lamports(9281751556n),
			lamports(1n),
			lamports(0n),
			lamports(377795713311n),
			lamports(107996140429n),
			lamports(1141440n),
			lamports(521498880n),
			lamports(934087680n),
			lamports(796511195283n),
			lamports(8039044n),
			lamports(0n),
			lamports(2039280n),
			lamports(2895360n),
			lamports(2039280n),
			lamports(2039280n),
			lamports(2039280n),
			lamports(1141440n),
			lamports(891480n),
			lamports(0n),
			lamports(991750264946n),
			lamports(1920960n),
			lamports(1141440n),
			lamports(1141440n)
		],
		postTokenBalances: [
			{
				accountIndex: 1,
				mint: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
				owner: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('64629507'),
					decimals: 6,
					uiAmount: 64.629507,
					uiAmountString: stringifiedNumber('64.629507')
				}
			},
			{
				accountIndex: 2,
				mint: address('So11111111111111111111111111111111111111112'),
				owner: address('4xDsmeTWPNjgSVSS1VTfzFq3iHZhp77ffPkAmkZkdu71'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('1029752407'),
					decimals: 9,
					uiAmount: 1.029752407,
					uiAmountString: stringifiedNumber('1.029752407')
				}
			},
			{
				accountIndex: 4,
				mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
				owner: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('7821210'),
					decimals: 6,
					uiAmount: 7.82121,
					uiAmountString: stringifiedNumber('7.82121')
				}
			},
			{
				accountIndex: 5,
				mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
				owner: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('24861523'),
					decimals: 6,
					uiAmount: 24.861523,
					uiAmountString: stringifiedNumber('24.861523')
				}
			},
			{
				accountIndex: 6,
				mint: address('So11111111111111111111111111111111111111112'),
				owner: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('1284226526'),
					decimals: 9,
					uiAmount: 1.284226526,
					uiAmountString: stringifiedNumber('1.284226526')
				}
			},
			{
				accountIndex: 20,
				mint: address('So11111111111111111111111111111111111111112'),
				owner: address('B6LL9aCWVuo1tTcJoYvCTDqYrq1vjMfci8uHxsm4UxTR'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('796509156002'),
					decimals: 9,
					uiAmount: 796.509156002,
					uiAmountString: stringifiedNumber('796.509156002')
				}
			},
			{
				accountIndex: 23,
				mint: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
				owner: address('B6LL9aCWVuo1tTcJoYvCTDqYrq1vjMfci8uHxsm4UxTR'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('6165244725'),
					decimals: 6,
					uiAmount: 6165.244725,
					uiAmountString: stringifiedNumber('6165.244725')
				}
			},
			{
				accountIndex: 25,
				mint: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
				owner: address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('1482548766477'),
					decimals: 6,
					uiAmount: 1482548.766477,
					uiAmountString: stringifiedNumber('1482548.766477')
				}
			},
			{
				accountIndex: 26,
				mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
				owner: address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('368112035805'),
					decimals: 6,
					uiAmount: 368112.035805,
					uiAmountString: stringifiedNumber('368112.035805')
				}
			},
			{
				accountIndex: 27,
				mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
				owner: address('8UgoPZAR8ZLoEmV6pJ8SZ6JKESP2X8nbnrZSdSgNtg1y'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('36018411875'),
					decimals: 6,
					uiAmount: 36018.411875,
					uiAmountString: stringifiedNumber('36018.411875')
				}
			}
		],
		preBalances: [
			lamports(10381328n),
			lamports(2040080n),
			lamports(1031791587n),
			lamports(70407360n),
			lamports(2039580n),
			lamports(2039280n),
			lamports(1288266307n),
			lamports(70407360n),
			lamports(70407360n),
			lamports(0n),
			lamports(5201095205n),
			lamports(1n),
			lamports(9281751556n),
			lamports(1n),
			lamports(0n),
			lamports(377795713311n),
			lamports(107996140429n),
			lamports(1141440n),
			lamports(521498880n),
			lamports(934087680n),
			lamports(796510195783n),
			lamports(8039044n),
			lamports(0n),
			lamports(2039280n),
			lamports(2895360n),
			lamports(2039280n),
			lamports(2039280n),
			lamports(2039280n),
			lamports(1141440n),
			lamports(891480n),
			lamports(0n),
			lamports(991750264946n),
			lamports(1920960n),
			lamports(1141440n),
			lamports(1141440n)
		],
		preTokenBalances: [
			{
				accountIndex: 1,
				mint: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
				owner: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('64629507'),
					decimals: 6,
					uiAmount: 64.629507,
					uiAmountString: stringifiedNumber('64.629507')
				}
			},
			{
				accountIndex: 2,
				mint: address('So11111111111111111111111111111111111111112'),
				owner: address('4xDsmeTWPNjgSVSS1VTfzFq3iHZhp77ffPkAmkZkdu71'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('1029751907'),
					decimals: 9,
					uiAmount: 1.029751907,
					uiAmountString: stringifiedNumber('1.029751907')
				}
			},
			{
				accountIndex: 4,
				mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
				owner: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('7821210'),
					decimals: 6,
					uiAmount: 7.82121,
					uiAmountString: stringifiedNumber('7.82121')
				}
			},
			{
				accountIndex: 5,
				mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
				owner: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('24719691'),
					decimals: 6,
					uiAmount: 24.719691,
					uiAmountString: stringifiedNumber('24.719691')
				}
			},
			{
				accountIndex: 6,
				mint: address('So11111111111111111111111111111111111111112'),
				owner: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('1284226526'),
					decimals: 9,
					uiAmount: 1.284226526,
					uiAmountString: stringifiedNumber('1.284226526')
				}
			},
			{
				accountIndex: 20,
				mint: address('So11111111111111111111111111111111111111112'),
				owner: address('B6LL9aCWVuo1tTcJoYvCTDqYrq1vjMfci8uHxsm4UxTR'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('796508156502'),
					decimals: 9,
					uiAmount: 796.508156502,
					uiAmountString: stringifiedNumber('796.508156502')
				}
			},
			{
				accountIndex: 23,
				mint: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
				owner: address('B6LL9aCWVuo1tTcJoYvCTDqYrq1vjMfci8uHxsm4UxTR'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('6165386679'),
					decimals: 6,
					uiAmount: 6165.386679,
					uiAmountString: stringifiedNumber('6165.386679')
				}
			},
			{
				accountIndex: 25,
				mint: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
				owner: address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('1482548624523'),
					decimals: 6,
					uiAmount: 1482548.624523,
					uiAmountString: stringifiedNumber('1482548.624523')
				}
			},
			{
				accountIndex: 26,
				mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
				owner: address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('368112177637'),
					decimals: 6,
					uiAmount: 368112.177637,
					uiAmountString: stringifiedNumber('368112.177637')
				}
			},
			{
				accountIndex: 27,
				mint: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
				owner: address('8UgoPZAR8ZLoEmV6pJ8SZ6JKESP2X8nbnrZSdSgNtg1y'),
				programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
				uiTokenAmount: {
					amount: stringifiedBigInt('36018411875'),
					decimals: 6,
					uiAmount: 36018.411875,
					uiAmountString: stringifiedNumber('36018.411875')
				}
			}
		],
		rewards: [],
		status: { Ok: null }
	},
	slot: 323420405n,
	transaction: {
		message: {
			accountKeys: [
				{
					pubkey: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1'),
					signer: true,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('6pXVFSACE5BND2C3ibGRWMG1fNtV7hfynWrfNKtCXhN3'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('6zAcFYmxkaH25qWZW5ek4dk4SyQNpSza3ydSoUxjTudD'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('73aLfp1JxetJ6UyjQRTjkedeAUJeT65qHmDUrPtij4jb'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('7u7cD7NxcZEuzRCBaYo8uVpotRdqZwez47vvuwzCov43'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('7xSNhASWK77oZtPyVQf1HFUXU1xxXjqkpkxVTULBmcMD'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('8ctcHN52LY21FEipCjr1MVWtoZa1irJQTPyAaTj72h7S'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('8Nm8YTgGPaHBGwZ3neR1LquSjr637j3rE7PPjJeMkzE9'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('9BcKSr2ETBFcfQN5GvdgfqKsrfhR4jP7ayZNgokBNhqn'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE'),
					signer: false,
					source: 'transaction',
					writable: true
				},
				{
					pubkey: address('11111111111111111111111111111111'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('ComputeBudget111111111111111111111111111111'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
					signer: false,
					source: 'transaction',
					writable: false
				},
				{
					pubkey: address('5PAmrLHaPnH95QqiCQ5x9Hn5MPGQZmQhKuL1kyS24r7G'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('B6LL9aCWVuo1tTcJoYvCTDqYrq1vjMfci8uHxsm4UxTR'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('F9Gj6DfjfoueaWHZsDMASx19RHYebXqsoEUx4hgWrZnE'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('vZ7uh4khfcUHKyc1dyaDhg21jDH5p5q4Pugr3R4v4Mp'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('4Lh8hhxS1vY2F3h1eJGuxP18GWGn8V7xeQHqgsL98fVR'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('95QUtvDkuoDZrNJiuh9MdahkpRNtSVhZRe83oepd8AM7'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('AioJRQXvcDLRhHMd6DAkTbbMpgVx63qSGQYmRBS2vHYA'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('ArLSJrSstZ3kjeZDyMAgjfjad1qdRZHHYaCQTQeAcTpa'),
					signer: false,
					source: 'lookupTable',
					writable: true
				},
				{
					pubkey: address('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
					signer: false,
					source: 'lookupTable',
					writable: false
				},
				{
					pubkey: address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
					signer: false,
					source: 'lookupTable',
					writable: false
				},
				{
					pubkey: address('8BSWYgAczR36C7ukr32v7uTepoRhYJYxAVnpBtYniZTm'),
					signer: false,
					source: 'lookupTable',
					writable: false
				},
				{
					pubkey: address('So11111111111111111111111111111111111111112'),
					signer: false,
					source: 'lookupTable',
					writable: false
				},
				{
					pubkey: address('stab1io8dHvK26KoHmTwwHyYmHRbUWbyEJx6CdrGabC'),
					signer: false,
					source: 'lookupTable',
					writable: false
				},
				{
					pubkey: address('swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ'),
					signer: false,
					source: 'lookupTable',
					writable: false
				},
				{
					pubkey: address('vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV'),
					signer: false,
					source: 'lookupTable',
					writable: false
				}
			],
			addressTableLookups: [
				{
					accountKey: address('8GU6nusbxwVrwkAkcQCnLfJj1cE4sGH5xCLmss5WEuP4'),
					readonlyIndexes: [146],
					writableIndexes: [148, 149, 156, 152]
				},
				{
					accountKey: address('9W6BH3BLditrazBMnT87jc5ZdKRLtUFmWqkLviWtdzXm'),
					readonlyIndexes: [69, 67, 10, 70, 68, 73],
					writableIndexes: [66, 63, 71, 72]
				}
			],
			instructions: [
				{
					accounts: [],
					data: 'FSaedm' as Base58EncodedBytes,
					programId: address('ComputeBudget111111111111111111111111111111'),
					stackHeight: undefined
				},
				{
					accounts: [],
					data: '3JW4F9HnXAQ7' as Base58EncodedBytes,
					programId: address('ComputeBudget111111111111111111111111111111'),
					stackHeight: undefined
				},
				{
					parsed: {
						info: {
							destination: address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3'),
							lamports: '3039280',
							source: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1')
						},
						type: 'transfer'
					},
					program: 'system',
					programId: address('11111111111111111111111111111111'),
					stackHeight: undefined
				},
				{
					accounts: [
						address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3'),
						address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1'),
						address('So11111111111111111111111111111111111111112'),
						address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						address('11111111111111111111111111111111')
					],
					data: '2tDqDdUmhLW1r' as Base58EncodedBytes,
					programId: address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
					stackHeight: undefined
				},
				{
					accounts: [
						address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
						address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1'),
						address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3'),
						address('8ctcHN52LY21FEipCjr1MVWtoZa1irJQTPyAaTj72h7S'),
						address('7u7cD7NxcZEuzRCBaYo8uVpotRdqZwez47vvuwzCov43'),
						address('7xSNhASWK77oZtPyVQf1HFUXU1xxXjqkpkxVTULBmcMD'),
						address('So11111111111111111111111111111111111111112'),
						address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
						address('6zAcFYmxkaH25qWZW5ek4dk4SyQNpSza3ydSoUxjTudD'),
						address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
						address('D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf'),
						address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
						address('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
						address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
						address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
						address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
						address('B6LL9aCWVuo1tTcJoYvCTDqYrq1vjMfci8uHxsm4UxTR'),
						address('So11111111111111111111111111111111111111112'),
						address('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
						address('8ctcHN52LY21FEipCjr1MVWtoZa1irJQTPyAaTj72h7S'),
						address('5PAmrLHaPnH95QqiCQ5x9Hn5MPGQZmQhKuL1kyS24r7G'),
						address('6pXVFSACE5BND2C3ibGRWMG1fNtV7hfynWrfNKtCXhN3'),
						address('vZ7uh4khfcUHKyc1dyaDhg21jDH5p5q4Pugr3R4v4Mp'),
						address('73aLfp1JxetJ6UyjQRTjkedeAUJeT65qHmDUrPtij4jb'),
						address('9BcKSr2ETBFcfQN5GvdgfqKsrfhR4jP7ayZNgokBNhqn'),
						address('8Nm8YTgGPaHBGwZ3neR1LquSjr637j3rE7PPjJeMkzE9'),
						address('F9Gj6DfjfoueaWHZsDMASx19RHYebXqsoEUx4hgWrZnE'),
						address('swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ'),
						address('BQ72nSv9f3PRyRKCBnHLVrerrv37CYTHm5h3s9VSGQDV'),
						address('6pXVFSACE5BND2C3ibGRWMG1fNtV7hfynWrfNKtCXhN3'),
						address('7u7cD7NxcZEuzRCBaYo8uVpotRdqZwez47vvuwzCov43'),
						address('95QUtvDkuoDZrNJiuh9MdahkpRNtSVhZRe83oepd8AM7'),
						address('AioJRQXvcDLRhHMd6DAkTbbMpgVx63qSGQYmRBS2vHYA'),
						address('ArLSJrSstZ3kjeZDyMAgjfjad1qdRZHHYaCQTQeAcTpa'),
						address('4Lh8hhxS1vY2F3h1eJGuxP18GWGn8V7xeQHqgsL98fVR'),
						address('8BSWYgAczR36C7ukr32v7uTepoRhYJYxAVnpBtYniZTm'),
						address('stab1io8dHvK26KoHmTwwHyYmHRbUWbyEJx6CdrGabC'),
						address('7imnGYfCovXjMWKdbQvETFVMe72MQDX4S5zW4GFxMJME'),
						address('vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV'),
						address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
					],
					data: '4DwqHy1NgGjQKMvTx3xxoArLEm4NxSBNLwp5MKLBaNTwT17Bgcbdr6Sk5z' as Base58EncodedBytes,
					programId: address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
					stackHeight: undefined
				},
				{
					parsed: {
						info: {
							account: address('F5Qu5Lx2aDwis6KwtpXBuHWHh2VGWewQAVEaatAKfir3'),
							destination: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1'),
							owner: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1')
						},
						type: 'closeAccount'
					},
					program: 'spl-token',
					programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
					stackHeight: undefined
				},
				{
					parsed: {
						info: {
							destination: address('noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE'),
							lamports: '624746',
							source: address('7q6RDbnn2SWnvews2qYCCAMCZzntDLM8scJfUEBmEMf1')
						},
						type: 'transfer'
					},
					program: 'system',
					programId: address('11111111111111111111111111111111'),
					stackHeight: undefined
				}
			],
			recentBlockhash: blockhash('3MNiN7EbG8fuK2kCfLDph82h6BPesXhZr8nRk6E8m6Do')
		},
		signatures: [
			'4E88TD8dpeivGbAn83DQcfQYyBcPF869Q9Nw9xfRvbZMDB46EMwC8FEqidJ5PoCZRSZVrBJJz486Ncju7duD3kwn' as Base58EncodedBytes
		]
	},
	version: 0,
	confirmationStatus: 'finalized',
	id: '4E88TD8dpeivGbAn83DQcfQYyBcPF869Q9Nw9xfRvbZMDB46EMwC8FEqidJ5PoCZRSZVrBJJz486Ncju7duD3kwn',
	signature: signature(
		'4E88TD8dpeivGbAn83DQcfQYyBcPF869Q9Nw9xfRvbZMDB46EMwC8FEqidJ5PoCZRSZVrBJJz486Ncju7duD3kwn'
	)
};

export const mockSolCertifiedTransactions: SolCertifiedTransaction[] = [
	{
		data: createMockSolTransactionUi(mockSolRpcReceiveTransaction.id),
		certified: false
	},
	{
		data: createMockSolTransactionUi(mockSolRpcSendTransaction.id),
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

export const mockSolParsedTransactionMessage: CompilableTransactionMessage = {
	feePayer: {
		address: address('5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q')
	},
	instructions: [
		{
			programAddress: address('ComputeBudget111111111111111111111111111111'),
			data: Uint8Array.from([2, 23, 83, 2, 0])
		},
		{
			programAddress: address('ComputeBudget111111111111111111111111111111'),
			data: Uint8Array.from([3, 38, 220, 23, 0, 0, 0, 0, 0])
		},
		{
			programAddress: address('11111111111111111111111111111111'),
			accounts: [
				{
					address: address('5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'),
					role: 3
				},
				{
					address: address('ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49'),
					addressIndex: 28,
					lookupTableAddress: address('7Vyx1y8vG9e9Q1MedmXpopRC6ZhVaZzGcvYh5Z3Cs75i'),
					role: 1
				}
			],
			data: Uint8Array.from([2, 0, 0, 0, 236, 19, 0, 0, 0, 0, 0, 0])
		},
		{
			programAddress: address('11111111111111111111111111111111'),
			accounts: [
				{
					address: address('5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'),
					role: 3
				},
				{
					address: address('DSkZKdPXxJYtcqcUzAkpHbr4or65H1a7WmePYsKQQBGH'),
					role: 3
				}
			],
			data: Uint8Array.from([
				0, 0, 0, 0, 240, 29, 31, 0, 0, 0, 0, 0, 165, 0, 0, 0, 0, 0, 0, 0, 6, 221, 246, 225, 215,
				101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145,
				58, 140, 245, 133, 126, 255, 0, 169
			])
		},
		{
			programAddress: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
			accounts: [
				{
					address: address('DSkZKdPXxJYtcqcUzAkpHbr4or65H1a7WmePYsKQQBGH'),
					role: 3
				},
				{
					address: address('So11111111111111111111111111111111111111112'),
					addressIndex: 0,
					lookupTableAddress: address('7Vyx1y8vG9e9Q1MedmXpopRC6ZhVaZzGcvYh5Z3Cs75i'),
					role: 0
				},
				{
					address: address('5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'),
					role: 3
				},
				{
					address: address('SysvarRent111111111111111111111111111111111'),
					addressIndex: 3,
					lookupTableAddress: address('7Vyx1y8vG9e9Q1MedmXpopRC6ZhVaZzGcvYh5Z3Cs75i'),
					role: 0
				}
			],
			data: Uint8Array.from([1])
		},
		{
			programAddress: address('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
			accounts: [
				{
					address: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
					role: 0
				},
				{
					address: address('5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'),
					role: 3
				},
				{
					address: address('FpCMFDFGYotvufJ7HrFHsWEiiQCGbkLCtwHiDnh7o28Q'),
					addressIndex: 37,
					lookupTableAddress: address('7Vyx1y8vG9e9Q1MedmXpopRC6ZhVaZzGcvYh5Z3Cs75i'),
					role: 1
				},
				{
					address: address('DSkZKdPXxJYtcqcUzAkpHbr4or65H1a7WmePYsKQQBGH'),
					role: 3
				},
				{
					address: address('6mQ8xEaHdTikyMvvMxUctYch6dUjnKgfoeib2msyMMi1'),
					addressIndex: 38,
					lookupTableAddress: address('7Vyx1y8vG9e9Q1MedmXpopRC6ZhVaZzGcvYh5Z3Cs75i'),
					role: 1
				},
				{
					address: address('6wqnX8qdyuvshkqMyproFnbnp3XCqF6P3eqWqdT7BTGU'),
					role: 1
				},
				{
					address: address('AQ36QRk3HAe6PHqBCtKTQnYKpt2kAagq9YoeTqUPMGHx'),
					addressIndex: 39,
					lookupTableAddress: address('7Vyx1y8vG9e9Q1MedmXpopRC6ZhVaZzGcvYh5Z3Cs75i'),
					role: 1
				},
				{
					address: address('Eo4qBMHT1TBKa7mNNvu5dKfTfY7gbKP3x8Bfgdcu1UwT'),
					addressIndex: 2,
					lookupTableAddress: address('3JsRWUYJvaRsXfjyj7sNpPor96ubQqgigSQxR37YWNAV'),
					role: 1
				},
				{
					address: address('7VMZua7JdRXowxinQ2YzFDvNTtYHuXGnS527Dc2ixej8'),
					addressIndex: 3,
					lookupTableAddress: address('3JsRWUYJvaRsXfjyj7sNpPor96ubQqgigSQxR37YWNAV'),
					role: 1
				},
				{
					address: address('41osFfamtiYDmFBfDruk95afaP1VDPPTPQfNTqGrV27M'),
					addressIndex: 4,
					lookupTableAddress: address('3JsRWUYJvaRsXfjyj7sNpPor96ubQqgigSQxR37YWNAV'),
					role: 1
				},
				{
					address: address('923j69hYbT5Set5kYfiQr1D8jPL6z15tbfTbVLSwUWJD'),
					addressIndex: 40,
					lookupTableAddress: address('7Vyx1y8vG9e9Q1MedmXpopRC6ZhVaZzGcvYh5Z3Cs75i'),
					role: 1
				}
			],
			data: Uint8Array.from([
				248, 198, 158, 145, 225, 117, 135, 200, 64, 66, 15, 0, 0, 0, 0, 0, 95, 227, 71, 0, 0, 0, 0,
				0, 175, 51, 27, 168, 50, 127, 187, 53, 177, 196, 254, 255, 0, 0, 0, 0, 1, 0
			])
		},
		{
			programAddress: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
			accounts: [
				{
					address: address('DSkZKdPXxJYtcqcUzAkpHbr4or65H1a7WmePYsKQQBGH'),
					role: 3
				},
				{
					address: address('5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'),
					role: 3
				},
				{
					address: address('5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'),
					role: 3
				}
			],
			data: Uint8Array.from([9])
		}
	],
	lifetimeConstraint: {
		blockhash: blockhash('HSR6rNUUeh6Grf2mVzP6u33wEfvXeLt7rNaTqkQoFLtN'),
		lastValidBlockHeight: 18446744073709551615n
	},
	version: 0
};
