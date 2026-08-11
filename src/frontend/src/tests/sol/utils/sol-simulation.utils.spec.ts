import { ZERO } from '$lib/constants/app.constants';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolanaParsedAccountInfo } from '$sol/types/sol-rpc';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import {
	isEmptySolSimulationPreview,
	mapSolSimulationPreview,
	selectSolSimulationAddresses
} from '$sol/utils/sol-simulation.utils';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2,
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
});
