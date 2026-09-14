import { STAKE_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import { parseSolStakeInstruction } from '$sol/utils/sol-instructions-stake.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import {
	identifyStakeInstruction,
	parseAuthorizeCheckedInstruction,
	parseAuthorizeCheckedWithSeedInstruction,
	parseAuthorizeInstruction,
	parseAuthorizeWithSeedInstruction,
	parseDeactivateDelinquentInstruction,
	parseDeactivateInstruction,
	parseDelegateStakeInstruction,
	parseGetMinimumDelegationInstruction,
	parseInitializeCheckedInstruction,
	parseInitializeInstruction,
	parseMergeInstruction,
	parseMoveLamportsInstruction,
	parseMoveStakeInstruction,
	parseSetLockupCheckedInstruction,
	parseSetLockupInstruction,
	parseSplitInstruction,
	parseWithdrawInstruction,
	StakeInstruction
} from '@solana-program/stake';
import { address } from '@solana/kit';

vi.mock(import('@solana-program/stake'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		identifyStakeInstruction: vi.fn(),
		parseInitializeInstruction: vi.fn(),
		parseAuthorizeInstruction: vi.fn(),
		parseDelegateStakeInstruction: vi.fn(),
		parseSplitInstruction: vi.fn(),
		parseWithdrawInstruction: vi.fn(),
		parseDeactivateInstruction: vi.fn(),
		parseSetLockupInstruction: vi.fn(),
		parseMergeInstruction: vi.fn(),
		parseAuthorizeWithSeedInstruction: vi.fn(),
		parseInitializeCheckedInstruction: vi.fn(),
		parseAuthorizeCheckedInstruction: vi.fn(),
		parseAuthorizeCheckedWithSeedInstruction: vi.fn(),
		parseSetLockupCheckedInstruction: vi.fn(),
		parseGetMinimumDelegationInstruction: vi.fn(),
		parseDeactivateDelinquentInstruction: vi.fn(),
		parseMoveStakeInstruction: vi.fn(),
		parseMoveLamportsInstruction: vi.fn()
	};
});

describe('sol-instructions-stake.utils', () => {
	describe('parseSolStakeInstruction', () => {
		const mockInstruction: SolInstruction = {
			accounts: [{ address: address(mockSolAddress), role: 3 }],
			data: new Uint8Array([1, 2, 3]),
			programAddress: address(STAKE_PROGRAM_ADDRESS)
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should raise an error if the instruction is missing the data', () => {
			const { data: _, ...withoutData } = mockInstruction;

			expect(() => parseSolStakeInstruction(withoutData)).toThrow(
				'The instruction does not have any data'
			);
		});

		it('should raise an error if the instruction is missing the accounts', () => {
			vi.mocked(identifyStakeInstruction).mockReturnValue(StakeInstruction.Withdraw);

			const { accounts: _, ...withoutAccounts } = mockInstruction;

			expect(() => parseSolStakeInstruction(withoutAccounts)).toThrow(
				'The instruction does not have any accounts'
			);
		});

		// It is the one stake instruction that names no account, so requiring accounts the way its
		// siblings do would reject a well-formed message.
		it('should parse a GetMinimumDelegation instruction that has no accounts', () => {
			vi.mocked(identifyStakeInstruction).mockReturnValue(StakeInstruction.GetMinimumDelegation);

			const { accounts: _, ...withoutAccounts } = mockInstruction;

			expect(parseSolStakeInstruction(withoutAccounts)).toStrictEqual({
				instructionType: StakeInstruction.GetMinimumDelegation
			});

			expect(parseGetMinimumDelegationInstruction).toHaveBeenCalledExactlyOnceWith(withoutAccounts);
		});

		it.each([
			{ instructionType: StakeInstruction.Initialize, parser: parseInitializeInstruction },
			{ instructionType: StakeInstruction.Authorize, parser: parseAuthorizeInstruction },
			{ instructionType: StakeInstruction.DelegateStake, parser: parseDelegateStakeInstruction },
			{ instructionType: StakeInstruction.Split, parser: parseSplitInstruction },
			{ instructionType: StakeInstruction.Withdraw, parser: parseWithdrawInstruction },
			{ instructionType: StakeInstruction.Deactivate, parser: parseDeactivateInstruction },
			{ instructionType: StakeInstruction.SetLockup, parser: parseSetLockupInstruction },
			{ instructionType: StakeInstruction.Merge, parser: parseMergeInstruction },
			{
				instructionType: StakeInstruction.AuthorizeWithSeed,
				parser: parseAuthorizeWithSeedInstruction
			},
			{
				instructionType: StakeInstruction.InitializeChecked,
				parser: parseInitializeCheckedInstruction
			},
			{
				instructionType: StakeInstruction.AuthorizeChecked,
				parser: parseAuthorizeCheckedInstruction
			},
			{
				instructionType: StakeInstruction.AuthorizeCheckedWithSeed,
				parser: parseAuthorizeCheckedWithSeedInstruction
			},
			{
				instructionType: StakeInstruction.SetLockupChecked,
				parser: parseSetLockupCheckedInstruction
			},
			{
				instructionType: StakeInstruction.DeactivateDelinquent,
				parser: parseDeactivateDelinquentInstruction
			},
			{ instructionType: StakeInstruction.MoveStake, parser: parseMoveStakeInstruction },
			{ instructionType: StakeInstruction.MoveLamports, parser: parseMoveLamportsInstruction }
		])('should parse a $instructionType instruction', ({ instructionType, parser }) => {
			vi.mocked(identifyStakeInstruction).mockReturnValue(instructionType);

			expect(parseSolStakeInstruction(mockInstruction)).toStrictEqual({ instructionType });

			expect(parser).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should raise an error if it is not a recognised Stake instruction', () => {
			// @ts-expect-error intentional for testing unknown discriminant
			vi.mocked(identifyStakeInstruction).mockReturnValue('unknown-instruction');

			expect(() => parseSolStakeInstruction(mockInstruction)).toThrow(
				'Unknown Solana Stake instruction: unknown-instruction'
			);
		});
	});
});
