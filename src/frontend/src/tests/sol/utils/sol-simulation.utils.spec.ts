import { ZERO } from '$lib/constants/app.constants';
import {
	STAKE_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolanaParsedAccountInfo, SolanaSimulatedInnerInstructions } from '$sol/types/sol-rpc';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import {
	findSolClosedAppAccounts,
	findSolUnreadPrograms,
	isEmptySolSimulationPreview,
	mapSolSimulationAccountOwners,
	mapSolSimulationPreview,
	selectSolSimulationAddresses,
	solClosedAccountsReachWallet,
	solOpenAppAccountsLostLamports
} from '$sol/utils/sol-simulation.utils';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { AccountRole } from '@solana/kit';

describe('sol-simulation.utils', () => {
	const systemAccount = ({
		lamports
	}: {
		lamports: bigint;
	}): NonNullable<SolanaParsedAccountInfo> =>
		({
			executable: false,
			lamports,
			owner: '11111111111111111111111111111111',
			space: ZERO,
			data: ['', 'base64']
		}) as unknown as NonNullable<SolanaParsedAccountInfo>;

	const tokenAccount = ({
		amount,
		owner,
		delegate,
		closeAuthority,
		program = TOKEN_PROGRAM_ADDRESS
	}: {
		amount: bigint;
		owner: SolAddress;
		delegate?: SolAddress;
		closeAuthority?: SolAddress;
		program?: SolAddress;
	}): NonNullable<SolanaParsedAccountInfo> =>
		({
			executable: false,
			lamports: 2_039_280n,
			owner: program,
			space: 165n,
			data: {
				program: 'spl-token',
				space: 165n,
				parsed: {
					type: 'account',
					info: {
						mint: mockSplAddress,
						owner,
						...(delegate !== undefined && { delegate }),
						...(closeAuthority !== undefined && { closeAuthority }),
						tokenAmount: { amount: `${amount}`, decimals: 6 }
					}
				}
			}
		}) as unknown as NonNullable<SolanaParsedAccountInfo>;

	describe('selectSolSimulationAddresses', () => {
		const message = ({
			instructions
		}: {
			instructions: { accounts?: { address: SolAddress; role: AccountRole }[] }[];
		}): CompilableTransactionMessage =>
			({
				feePayer: { address: mockSolAddress },
				instructions
			}) as unknown as CompilableTransactionMessage;

		it('should always include the fee payer', () => {
			expect(selectSolSimulationAddresses(message({ instructions: [] }))).toEqual([mockSolAddress]);
		});

		it('should keep writable accounts and drop read-only ones', () => {
			const addresses = selectSolSimulationAddresses(
				message({
					instructions: [
						{
							accounts: [
								{ address: mockAtaAddress, role: AccountRole.WRITABLE },
								{ address: mockSolAddress2, role: AccountRole.READONLY },
								{ address: mockAtaAddress2, role: AccountRole.WRITABLE_SIGNER }
							]
						}
					]
				})
			);

			expect(addresses).toEqual([mockSolAddress, mockAtaAddress, mockAtaAddress2]);
		});

		it('should deduplicate an account named by several instructions', () => {
			const addresses = selectSolSimulationAddresses(
				message({
					instructions: [
						{ accounts: [{ address: mockAtaAddress, role: AccountRole.WRITABLE }] },
						{ accounts: [{ address: mockAtaAddress, role: AccountRole.WRITABLE }] },
						{ accounts: [{ address: mockSolAddress, role: AccountRole.WRITABLE_SIGNER }] }
					]
				})
			);

			expect(addresses).toEqual([mockSolAddress, mockAtaAddress]);
		});

		it('should tolerate an instruction without accounts', () => {
			expect(selectSolSimulationAddresses(message({ instructions: [{}] }))).toEqual([
				mockSolAddress
			]);
		});
	});

	describe('mapSolSimulationPreview', () => {
		it('should report the fee payer lamport delta', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockSolAddress],
				preAccounts: [systemAccount({ lamports: 1_000_000n })],
				postAccounts: [systemAccount({ lamports: 990_000n })],
				userAddress: mockSolAddress
			});

			expect(preview).toEqual({ solDelta: -10_000n, tokenDeltas: [], controlChanges: [] });
		});

		it('should report token deltas for the token accounts the user owns', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockAtaAddress],
				preAccounts: [tokenAccount({ amount: 5_000_000n, owner: mockSolAddress })],
				postAccounts: [tokenAccount({ amount: 1_000_000n, owner: mockSolAddress })],
				userAddress: mockSolAddress
			});

			expect(preview).toEqual({
				tokenDeltas: [
					{
						account: mockAtaAddress,
						tokenAddress: mockSplAddress,
						decimals: 6,
						delta: -4_000_000n
					}
				],
				controlChanges: []
			});
		});

		it('should ignore accounts the user does not own', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockAtaAddress],
				preAccounts: [tokenAccount({ amount: 5_000_000n, owner: mockSolAddress2 })],
				postAccounts: [tokenAccount({ amount: 9_000_000n, owner: mockSolAddress2 })],
				userAddress: mockSolAddress
			});

			expect(isEmptySolSimulationPreview(preview)).toBeTruthy();
		});

		// The whole reason control fields are diffed: the balance is untouched, so an
		// amount-only preview would describe the takeover as nothing happening.
		it('should report an owner takeover that moves no tokens at all', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockAtaAddress],
				preAccounts: [tokenAccount({ amount: 5_000_000n, owner: mockSolAddress })],
				postAccounts: [tokenAccount({ amount: 5_000_000n, owner: mockSolAddress2 })],
				userAddress: mockSolAddress
			});

			expect(preview).toEqual({
				tokenDeltas: [],
				controlChanges: [{ account: mockAtaAddress, field: 'owner', to: mockSolAddress2 }]
			});
			expect(isEmptySolSimulationPreview(preview)).toBeFalsy();
		});

		it('should report a new delegate', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockAtaAddress],
				preAccounts: [tokenAccount({ amount: 5_000_000n, owner: mockSolAddress })],
				postAccounts: [
					tokenAccount({ amount: 5_000_000n, owner: mockSolAddress, delegate: mockSolAddress2 })
				],
				userAddress: mockSolAddress
			});

			expect(preview.controlChanges).toEqual([
				{ account: mockAtaAddress, field: 'delegate', to: mockSolAddress2 }
			]);
		});

		it('should report a removed delegate without a new value', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockAtaAddress],
				preAccounts: [
					tokenAccount({ amount: 5_000_000n, owner: mockSolAddress, delegate: mockSolAddress2 })
				],
				postAccounts: [tokenAccount({ amount: 5_000_000n, owner: mockSolAddress })],
				userAddress: mockSolAddress
			});

			expect(preview.controlChanges).toEqual([{ account: mockAtaAddress, field: 'delegate' }]);
		});

		it('should report a new close authority', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockAtaAddress],
				preAccounts: [tokenAccount({ amount: 1n, owner: mockSolAddress })],
				postAccounts: [
					tokenAccount({ amount: 1n, owner: mockSolAddress, closeAuthority: mockSolAddress2 })
				],
				userAddress: mockSolAddress
			});

			expect(preview.controlChanges).toEqual([
				{ account: mockAtaAddress, field: 'closeAuthority', to: mockSolAddress2 }
			]);
		});

		it('should report a reassigned owning program', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockAtaAddress],
				preAccounts: [tokenAccount({ amount: 1n, owner: mockSolAddress })],
				postAccounts: [
					tokenAccount({ amount: 1n, owner: mockSolAddress, program: mockSolAddress2 })
				],
				userAddress: mockSolAddress
			});

			expect(preview.controlChanges).toEqual([
				{ account: mockAtaAddress, field: 'program', to: mockSolAddress2 }
			]);
		});

		it('should keep a token account the message creates, which has no pre-state', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockAtaAddress],
				preAccounts: [null],
				postAccounts: [tokenAccount({ amount: 3_000_000n, owner: mockSolAddress })],
				userAddress: mockSolAddress
			});

			expect(preview).toEqual({
				tokenDeltas: [
					{
						account: mockAtaAddress,
						tokenAddress: mockSplAddress,
						decimals: 6,
						delta: 3_000_000n
					}
				],
				controlChanges: []
			});
		});

		it('should omit a zero SOL delta', () => {
			const preview = mapSolSimulationPreview({
				addresses: [mockSolAddress],
				preAccounts: [systemAccount({ lamports: 1_000_000n })],
				postAccounts: [systemAccount({ lamports: 1_000_000n })],
				userAddress: mockSolAddress
			});

			expect(preview).not.toHaveProperty('solDelta');
			expect(isEmptySolSimulationPreview(preview)).toBeTruthy();
		});
	});

	describe('mapSolSimulationAccountOwners', () => {
		it('should own the token accounts the user owns, not only their wallet', () => {
			const { ownedAddresses } = mapSolSimulationAccountOwners({
				addresses: [mockSolAddress, mockAtaAddress, mockAtaAddress2],
				preAccounts: [
					systemAccount({ lamports: 1_000_000n }),
					tokenAccount({ amount: 5_000n, owner: mockSolAddress }),
					tokenAccount({ amount: 5_000n, owner: mockSolAddress2 })
				],
				postAccounts: [
					systemAccount({ lamports: 900_000n }),
					tokenAccount({ amount: 4_000n, owner: mockSolAddress }),
					tokenAccount({ amount: 6_000n, owner: mockSolAddress2 })
				],
				userAddress: mockSolAddress
			});

			expect(ownedAddresses).toEqual([mockSolAddress, mockAtaAddress]);
		});

		it('should own an account the message creates, which has no pre-state to read', () => {
			const { ownedAddresses, addressToOwner } = mapSolSimulationAccountOwners({
				addresses: [mockAtaAddress],
				preAccounts: [null],
				postAccounts: [tokenAccount({ amount: ZERO, owner: mockSolAddress })],
				userAddress: mockSolAddress
			});

			expect(ownedAddresses).toEqual([mockAtaAddress]);
			expect(addressToOwner).toEqual({ [mockAtaAddress]: mockSolAddress });
		});

		it('should name the owner and the mint of every token account it saw', () => {
			const { addressToOwner, addressToToken } = mapSolSimulationAccountOwners({
				addresses: [mockSolAddress, mockAtaAddress2],
				preAccounts: [
					systemAccount({ lamports: 1_000_000n }),
					tokenAccount({ amount: 5_000n, owner: mockSolAddress2 })
				],
				postAccounts: [
					systemAccount({ lamports: 1_000_000n }),
					tokenAccount({ amount: 5_000n, owner: mockSolAddress2 })
				],
				userAddress: mockSolAddress
			});

			// A wallet has no owner of its own, so it contributes to neither map.
			expect(addressToOwner).toEqual({ [mockAtaAddress2]: mockSolAddress2 });
			expect(addressToToken).toEqual({ [mockAtaAddress2]: mockSplAddress });
		});
	});

	describe('findSolUnreadPrograms', () => {
		const JUPITER = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

		// The RPC parses the calls of the programs it knows and hands the rest over as raw data;
		// both name their program the same way.
		const parsed = (programId: SolAddress) => ({
			program: 'spl-token',
			programId,
			parsed: { type: 'transfer', info: {} },
			stackHeight: 2
		});
		const raw = (programId: SolAddress) => ({ programId, accounts: [], data: '', stackHeight: 2 });

		const run = (groups: { index: number; instructions: unknown[] }[]) =>
			groups as unknown as SolanaSimulatedInnerInstructions;

		it('should find nothing in a run whose nested calls all reach known programs', () => {
			expect(
				findSolUnreadPrograms(
					run([
						{
							index: 2,
							instructions: [
								parsed(TOKEN_PROGRAM_ADDRESS),
								raw(JUPITER),
								parsed(SYSTEM_PROGRAM_ADDRESS)
							]
						}
					])
				)
			).toEqual([]);
		});

		it('should find nothing in a run without nested calls', () => {
			expect(findSolUnreadPrograms(run([]))).toEqual([]);
		});

		it('should name each other program once, in the order the run first reaches it', () => {
			expect(
				findSolUnreadPrograms(
					run([
						{
							index: 0,
							instructions: [
								parsed(TOKEN_PROGRAM_ADDRESS),
								raw(mockSolAddress3),
								parsed(STAKE_PROGRAM_ADDRESS),
								raw(mockSolAddress3)
							]
						},
						{ index: 1, instructions: [raw(mockSolAddress2), parsed(STAKE_PROGRAM_ADDRESS)] }
					])
				)
			).toEqual([mockSolAddress3, STAKE_PROGRAM_ADDRESS, mockSolAddress2]);
		});

		// A call that only points into the account list could reach anything, and an empty list
		// would say it reaches a known program.
		it('should find nothing to rely on when a nested call does not name its program', () => {
			expect(
				findSolUnreadPrograms(
					run([
						{
							index: 0,
							instructions: [raw(JUPITER), { programIdIndex: 7, accounts: [], data: '' }]
						}
					])
				)
			).toBeUndefined();
		});
	});

	describe('findSolClosedAppAccounts', () => {
		const application = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo';

		const appAccount = (lamports: bigint): NonNullable<SolanaParsedAccountInfo> =>
			({
				executable: false,
				lamports,
				owner: application,
				space: 8120n,
				data: ['', 'base64']
			}) as unknown as NonNullable<SolanaParsedAccountInfo>;

		it('should find an application account the run empties', () => {
			expect(
				findSolClosedAppAccounts({
					addresses: [mockSolAddress2],
					preAccounts: [appAccount(41_899_840n)],
					postAccounts: [systemAccount({ lamports: ZERO })]
				})
			).toStrictEqual([{ account: mockSolAddress2, program: application, lamports: 41_899_840n }]);
		});

		it('should find one the run leaves no account of at all', () => {
			expect(
				findSolClosedAppAccounts({
					addresses: [mockSolAddress2],
					preAccounts: [appAccount(41_899_840n)],
					postAccounts: [null]
				})
			).toHaveLength(1);
		});

		it('should leave out an account that keeps lamports', () => {
			expect(
				findSolClosedAppAccounts({
					addresses: [mockSolAddress2],
					preAccounts: [appAccount(41_899_840n)],
					postAccounts: [appAccount(1n)]
				})
			).toStrictEqual([]);
		});

		// What leaves a wallet does so by a transfer the run states, and a token account is closed by
		// an instruction that names where its balance goes.
		it('should leave out wallets and token accounts', () => {
			expect(
				findSolClosedAppAccounts({
					addresses: [mockSolAddress, mockAtaAddress],
					preAccounts: [
						systemAccount({ lamports: 1_000_000n }),
						tokenAccount({ amount: ZERO, owner: mockSolAddress })
					],
					postAccounts: [null, null]
				})
			).toStrictEqual([]);
		});

		it('should say nothing of an account the run did not report on', () => {
			expect(
				findSolClosedAppAccounts({
					addresses: [mockSolAddress2],
					preAccounts: [appAccount(41_899_840n)],
					postAccounts: []
				})
			).toStrictEqual([]);
		});
	});

	describe('solOpenAppAccountsLostLamports', () => {
		const appAccount = (lamports: bigint): NonNullable<SolanaParsedAccountInfo> =>
			({
				executable: false,
				lamports,
				owner: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
				space: 8120n,
				data: ['', 'base64']
			}) as unknown as NonNullable<SolanaParsedAccountInfo>;

		const lost = ({
			pre,
			post
		}: {
			pre: NonNullable<SolanaParsedAccountInfo>;
			post: SolanaParsedAccountInfo;
		}) =>
			solOpenAppAccountsLostLamports({
				addresses: [mockSolAddress2],
				preAccounts: [pre],
				postAccounts: [post]
			});

		// Its program could pay the wallet from it, which no line states.
		it('should say so of an app account that stays open with fewer lamports', () => {
			expect(lost({ pre: appAccount(100_000_000n), post: appAccount(58_100_160n) })).toBeTruthy();
		});

		it('should not of one that keeps its lamports', () => {
			expect(lost({ pre: appAccount(41_899_840n), post: appAccount(41_899_840n) })).toBeFalsy();
		});

		// An emptied account is a close, which is checked on its own.
		it('should not of one the run empties', () => {
			expect(lost({ pre: appAccount(41_899_840n), post: null })).toBeFalsy();
		});

		it('should not of wallets and token accounts', () => {
			expect(
				lost({
					pre: systemAccount({ lamports: 2_000_000n }),
					post: systemAccount({ lamports: 1n })
				})
			).toBeFalsy();
		});
	});

	describe('solClosedAccountsReachWallet', () => {
		const closedAccounts = [
			{ account: mockSolAddress2, program: mockSolAddress3, lamports: 41_899_840n }
		];

		it('should hold when the rest of the wallet’s change is exactly what the accounts held', () => {
			expect(
				solClosedAccountsReachWallet({
					closedAccounts,
					walletChange: 41_894_840n - 19_028n,
					statedChange: -19_028n,
					fee: 5_000n
				})
			).toBeTruthy();
		});

		it('should not hold when part of it went elsewhere', () => {
			expect(
				solClosedAccountsReachWallet({
					closedAccounts,
					walletChange: 41_000_000n,
					statedChange: ZERO,
					fee: 5_000n
				})
			).toBeFalsy();
		});

		it('should not hold when a line moves the wallet by an amount nobody read', () => {
			expect(
				solClosedAccountsReachWallet({
					closedAccounts,
					walletChange: 41_894_840n,
					statedChange: undefined,
					fee: 5_000n
				})
			).toBeFalsy();
		});

		it('should not hold when nothing was closed', () => {
			expect(
				solClosedAccountsReachWallet({
					closedAccounts: [],
					walletChange: -5_000n,
					statedChange: ZERO,
					fee: 5_000n
				})
			).toBeFalsy();
		});
	});
});
