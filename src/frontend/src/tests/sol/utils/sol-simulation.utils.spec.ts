import { ZERO } from '$lib/constants/app.constants';
import {
	STAKE_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolanaParsedAccountInfo, SolanaSimulatedInnerInstructions } from '$sol/types/sol-rpc';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import {
	findSolUnreadPrograms,
	isEmptySolSimulationPreview,
	mapSolSimulationAccountOwners,
	mapSolSimulationPreview,
	selectSolSimulationAddresses,
	solSimulationReassignsWallet
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

	describe('solSimulationReassignsWallet', () => {
		const preview = (
			controlChanges: SolSimulationPreview['controlChanges']
		): SolSimulationPreview => ({ tokenDeltas: [], controlChanges });

		it('should be true when the run hands the wallet to another program', () => {
			expect(
				solSimulationReassignsWallet({
					preview: preview([
						{ account: mockSolAddress, field: 'program', to: STAKE_PROGRAM_ADDRESS }
					]),
					userAddress: mockSolAddress
				})
			).toBeTruthy();
		});

		// Only the wallet: a change to another of the user's accounts is shown by the preview, but is
		// not this question.
		it('should be false when another account of the user changes program', () => {
			expect(
				solSimulationReassignsWallet({
					preview: preview([{ account: mockAtaAddress, field: 'program', to: mockSolAddress2 }]),
					userAddress: mockSolAddress
				})
			).toBeFalsy();
		});

		it('should be false for a control change other than the owning program', () => {
			expect(
				solSimulationReassignsWallet({
					preview: preview([{ account: mockSolAddress, field: 'owner', to: mockSolAddress2 }]),
					userAddress: mockSolAddress
				})
			).toBeFalsy();
		});

		it('should be false without a preview', () => {
			expect(
				solSimulationReassignsWallet({ preview: undefined, userAddress: mockSolAddress })
			).toBeFalsy();
		});

		it('should be false without a wallet', () => {
			expect(
				solSimulationReassignsWallet({
					preview: preview([{ account: mockSolAddress, field: 'program', to: mockSolAddress2 }]),
					userAddress: undefined
				})
			).toBeFalsy();
		});

		// End to end through the diff: a System-owned wallet the run leaves owned by another program.
		it('should be true for the diff of a wallet assigned during the run', () => {
			const diffed = mapSolSimulationPreview({
				addresses: [mockSolAddress],
				preAccounts: [systemAccount({ lamports: 1_000_000n })],
				postAccounts: [
					{
						...systemAccount({ lamports: 995_000n }),
						owner: mockSolAddress3
					} as NonNullable<SolanaParsedAccountInfo>
				],
				userAddress: mockSolAddress
			});

			expect(
				solSimulationReassignsWallet({ preview: diffed, userAddress: mockSolAddress })
			).toBeTruthy();
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
});
