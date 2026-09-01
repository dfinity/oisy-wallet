import { MEMO_LEGACY_PROGRAM_ADDRESS, MEMO_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import { parseSolMemoInstruction } from '$sol/utils/sol-instructions-memo.utils';
import { getAddMemoInstruction, MemoInstruction } from '@solana-program/memo';
import { address } from '@solana/kit';

describe('sol-instructions-memo.utils', () => {
	describe('parseSolMemoInstruction', () => {
		it('should parse the text of a memo', () => {
			const instruction = getAddMemoInstruction({ memo: 'Deposit 42' });

			expect(parseSolMemoInstruction(instruction)).toStrictEqual({
				programAddress: MEMO_PROGRAM_ADDRESS,
				data: { memo: 'Deposit 42' },
				instructionType: MemoInstruction.AddMemo
			});
		});

		it('should parse a memo addressed to the legacy program', () => {
			const instruction = getAddMemoInstruction(
				{ memo: 'Deposit 42' },
				{ programAddress: address(MEMO_LEGACY_PROGRAM_ADDRESS) }
			);

			expect(parseSolMemoInstruction(instruction)).toStrictEqual({
				programAddress: MEMO_LEGACY_PROGRAM_ADDRESS,
				data: { memo: 'Deposit 42' },
				instructionType: MemoInstruction.AddMemo
			});
		});

		// The dApp chooses the data, so the review has to survive an instruction that carries none.
		it('should read a memo with no data as a memo of nothing rather than throw', () => {
			const instruction: SolInstruction = {
				programAddress: address(MEMO_PROGRAM_ADDRESS)
			};

			expect(parseSolMemoInstruction(instruction)).toStrictEqual({
				programAddress: MEMO_PROGRAM_ADDRESS,
				data: { memo: '' },
				instructionType: MemoInstruction.AddMemo
			});
		});

		it('should not throw on bytes that are not valid UTF-8', () => {
			const instruction: SolInstruction = {
				data: new Uint8Array([0xff, 0xfe, 0xfd]),
				programAddress: address(MEMO_PROGRAM_ADDRESS)
			};

			expect(() => parseSolMemoInstruction(instruction)).not.toThrow();
		});
	});
});
