import type { SolInstruction, SolParsedStakeInstruction } from '$sol/types/sol-instructions';
import { assertNever } from '@dfinity/utils';
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
import { assertIsInstructionWithAccounts, assertIsInstructionWithData } from '@solana/kit';

export const parseSolStakeInstruction = (
	instruction: SolInstruction
): SolParsedStakeInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);

	const decodedInstruction = identifyStakeInstruction(instruction);

	// Alone among the stake instructions, this one names no account: it is a query the runtime
	// answers, so asserting accounts the way the others need would reject a well-formed message.
	if (decodedInstruction === StakeInstruction.GetMinimumDelegation) {
		return {
			...parseGetMinimumDelegationInstruction(instruction),
			instructionType: StakeInstruction.GetMinimumDelegation
		};
	}

	assertIsInstructionWithAccounts(instruction);

	switch (decodedInstruction) {
		case StakeInstruction.Initialize:
			return {
				...parseInitializeInstruction(instruction),
				instructionType: StakeInstruction.Initialize
			};
		case StakeInstruction.Authorize:
			return {
				...parseAuthorizeInstruction(instruction),
				instructionType: StakeInstruction.Authorize
			};
		case StakeInstruction.DelegateStake:
			return {
				...parseDelegateStakeInstruction(instruction),
				instructionType: StakeInstruction.DelegateStake
			};
		case StakeInstruction.Split:
			return {
				...parseSplitInstruction(instruction),
				instructionType: StakeInstruction.Split
			};
		case StakeInstruction.Withdraw:
			return {
				...parseWithdrawInstruction(instruction),
				instructionType: StakeInstruction.Withdraw
			};
		case StakeInstruction.Deactivate:
			return {
				...parseDeactivateInstruction(instruction),
				instructionType: StakeInstruction.Deactivate
			};
		case StakeInstruction.SetLockup:
			return {
				...parseSetLockupInstruction(instruction),
				instructionType: StakeInstruction.SetLockup
			};
		case StakeInstruction.Merge:
			return {
				...parseMergeInstruction(instruction),
				instructionType: StakeInstruction.Merge
			};
		case StakeInstruction.AuthorizeWithSeed:
			return {
				...parseAuthorizeWithSeedInstruction(instruction),
				instructionType: StakeInstruction.AuthorizeWithSeed
			};
		case StakeInstruction.InitializeChecked:
			return {
				...parseInitializeCheckedInstruction(instruction),
				instructionType: StakeInstruction.InitializeChecked
			};
		case StakeInstruction.AuthorizeChecked:
			return {
				...parseAuthorizeCheckedInstruction(instruction),
				instructionType: StakeInstruction.AuthorizeChecked
			};
		case StakeInstruction.AuthorizeCheckedWithSeed:
			return {
				...parseAuthorizeCheckedWithSeedInstruction(instruction),
				instructionType: StakeInstruction.AuthorizeCheckedWithSeed
			};
		case StakeInstruction.SetLockupChecked:
			return {
				...parseSetLockupCheckedInstruction(instruction),
				instructionType: StakeInstruction.SetLockupChecked
			};
		case StakeInstruction.DeactivateDelinquent:
			return {
				...parseDeactivateDelinquentInstruction(instruction),
				instructionType: StakeInstruction.DeactivateDelinquent
			};
		case StakeInstruction.MoveStake:
			return {
				...parseMoveStakeInstruction(instruction),
				instructionType: StakeInstruction.MoveStake
			};
		case StakeInstruction.MoveLamports:
			return {
				...parseMoveLamportsInstruction(instruction),
				instructionType: StakeInstruction.MoveLamports
			};
		default: {
			assertNever(decodedInstruction, `Unknown Solana Stake instruction: ${decodedInstruction}`);
		}
	}
};
