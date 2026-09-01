import type { SolInstruction, SolParsedMemoInstruction } from '$sol/types/sol-instructions';
import { MemoInstruction, parseAddMemoInstruction } from '@solana-program/memo';
import { isInstructionWithData } from '@solana/kit';

/**
 * The Memo program has a single instruction and no discriminator: its data is the memo itself, so
 * there is nothing to identify and the decode cannot pick the wrong variant.
 *
 * Unlike its siblings this one never throws. The data it reads is a string the dApp chose, down to
 * whether it sent any at all, and the parse runs on the signing path: an instruction carrying no
 * data is a memo of nothing rather than a decode that failed.
 */
export const parseSolMemoInstruction = (instruction: SolInstruction): SolParsedMemoInstruction => {
	const { programAddress } = instruction;

	if (!isInstructionWithData(instruction)) {
		return {
			programAddress,
			data: { memo: '' },
			instructionType: MemoInstruction.AddMemo
		};
	}

	return {
		...parseAddMemoInstruction(instruction),
		instructionType: MemoInstruction.AddMemo
	};
};
