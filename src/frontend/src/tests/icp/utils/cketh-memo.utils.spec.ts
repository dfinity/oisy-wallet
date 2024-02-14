import {
	BURN_MEMO_CONVERT,
	decodeBurnMemo,
	decodeMintMemo,
	MINT_MEMO_CONVERT,
	MINT_MEMO_REIMBURSE
} from '$icp/utils/cketh-memo.utils';
import { uint8ArrayToHexString } from '@dfinity/utils';
import { expect } from 'vitest';

describe('cketh-memo.utils', () => {
	describe('decode mint memo', () => {
		it('should decode memo to converted', () => {
			const memo = new Uint8Array([
				130, 0, 131, 84, 221, 40, 81, 205, 212, 10, 230, 83, 104, 49, 85, 141, 212, 109, 182, 47,
				172, 122, 132, 77, 88, 32, 112, 95, 130, 104, 97, 200, 2, 180, 7, 132, 62, 153, 175, 152,
				108, 253, 232, 116, 155, 102, 158, 94, 10, 90, 21, 15, 67, 80, 188, 170, 155, 195, 24, 39
			]);

			const [type, values] = decodeMintMemo(memo);

			expect(type).toEqual(MINT_MEMO_CONVERT);

			const [from_address, tx_hash, log_index] = values;

			expect(uint8ArrayToHexString(from_address as Uint8Array)).toEqual(
				'dd2851cdd40ae6536831558dd46db62fac7a844d'
			);
			expect(uint8ArrayToHexString(tx_hash)).toEqual(
				'705f826861c802b407843e99af986cfde8749b669e5e0a5a150f4350bcaa9bc3'
			);
			expect(log_index).toEqual(39);
		});

		it('should decode memo to reimbursement', () => {
			const memo = new Uint8Array([
				130, 1, 130, 25, 4, 210, 88, 32, 112, 95, 130, 104, 97, 200, 2, 180, 7, 132, 62, 153, 175,
				152, 108, 253, 232, 116, 155, 102, 158, 94, 10, 90, 21, 15, 67, 80, 188, 170, 155, 195
			]);

			const [type, values] = decodeMintMemo(memo);

			expect(type).toEqual(MINT_MEMO_REIMBURSE);

			const [withdrawalId, from_address] = values;

			expect(withdrawalId).toEqual(1234);
			expect(uint8ArrayToHexString(from_address as Uint8Array)).toEqual(
				'705f826861c802b407843e99af986cfde8749b669e5e0a5a150f4350bcaa9bc3'
			);
		});
	});

	describe('decode burn memo', () => {
		it('should decode memo to withdrawal', () => {
			const memo = new Uint8Array([
				130, 0, 129, 84, 221, 40, 81, 205, 212, 10, 230, 83, 104, 49, 85, 141, 212, 109, 182, 47,
				172, 122, 132, 77
			]);

			const [type, values] = decodeBurnMemo(memo);

			expect(type).toEqual(BURN_MEMO_CONVERT);

			const [to_address] = values;

			expect(uint8ArrayToHexString(to_address as Uint8Array)).toEqual(
				'dd2851cdd40ae6536831558dd46db62fac7a844d'
			);
		});
	});
});
