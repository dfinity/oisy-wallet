import { decodeBurnMemo, decodeMintMemo, MINT_MEMO_CONVERT } from '$icp/utils/cketh-memo.utils';
import { Cbor } from '@dfinity/agent';
import { hexStringToUint8Array, uint8ArrayToHexString } from '@dfinity/utils';
import { expect } from 'vitest';

describe('cketh-memo.utils', () => {
	describe('decode mint memo', () => {
		it('should decode memo to converted', () => {
			const memo = new Uint8Array([
				130, 0, 131, 84, 5, 153, 246, 109, 133, 205, 248, 66, 113, 14, 80, 204, 194, 44, 28, 124,
				106, 86, 54, 236, 88, 32, 69, 157, 42, 73, 138, 11, 70, 125, 99, 163, 169, 127, 237, 23,
				211, 193, 50, 219, 122, 202, 238, 198, 1, 12, 69, 131, 69, 152, 173, 198, 9, 5, 24, 84
			]);

			const [type, values] = decodeMintMemo(memo);

			expect(type).toEqual(MINT_MEMO_CONVERT);

			const [from_address, tx_hash, log_index] = values;

			expect(uint8ArrayToHexString(from_address as Uint8Array)).toEqual(
				'0599f66d85cdf842710e50ccc22c1c7c6a5636ec'
			);
			expect(uint8ArrayToHexString(tx_hash)).toEqual(
				'459d2a498a0b467d63a3a97fed17d3c132db7acaeec6010c45834598adc60905'
			);
			expect(log_index).toEqual(84);
		});

		it('should decode memo to reimbursement', () => {
			const withdrawalId = 1331;
			const tx_hash = hexStringToUint8Array(
				'459d2a498a0b467d63a3a97fed17d3c132db7acaeec6010c45834598adc60905'
			);
			const decodedMemo = [1, [withdrawalId, tx_hash]];
			const memo = new Uint8Array(Cbor.encode(decodedMemo));

			expect(decodeMintMemo(memo)).toEqual(decodedMemo);
		});
	});

	describe('decode burn memo', () => {
		it('should decode memo as withdrawal', () => {
			const toAddress = hexStringToUint8Array('0599f66d85cdf842710e50ccc22c1c7c6a5636ec');
			const decodedMemo = [0, [toAddress]];
			const memo = new Uint8Array(Cbor.encode(decodedMemo));

			expect(decodeBurnMemo(memo)).toEqual(decodedMemo);
		});
	});
});
