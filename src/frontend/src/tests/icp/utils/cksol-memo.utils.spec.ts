import { decodeBurnMemo, decodeMintMemo } from '$icp/utils/cksol-memo.utils';
import {
	mockCkSolBurnMemo,
	mockCkSolMintMemo,
	mockCkSolSweepSignature,
	mockCkSolSweepSignatureBytes
} from '$tests/mocks/cksol.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { getBase58Decoder, getBase58Encoder } from '@solana/kit';

describe('cksol-memo.utils', () => {
	describe('decodeMintMemo', () => {
		it('should decode the signature of the sweep', () => {
			const { signature } = decodeMintMemo(mockCkSolMintMemo());

			expect(getBase58Decoder().decode(signature)).toBe(mockCkSolSweepSignature);
		});

		it('should decode a deposit id that takes more than one byte', () => {
			const memo = Uint8Array.from([
				...mockCkSolMintMemo().slice(0, -1),
				0x1b,
				0xff,
				0xff,
				0xff,
				0xff,
				0xff,
				0xff,
				0xff,
				0xff
			]);

			const { signature } = decodeMintMemo(memo);

			expect(getBase58Decoder().decode(signature)).toBe(mockCkSolSweepSignature);
		});

		it('should reject a burn memo', () => {
			expect(() => decodeMintMemo(mockCkSolBurnMemo(mockSolAddress))).toThrow();
		});

		it('should reject another mint variant', () => {
			const memo = Uint8Array.from([
				0x82,
				0x00,
				0x81,
				0x82,
				0x00,
				0x82,
				0x58,
				0x40,
				...mockCkSolSweepSignatureBytes,
				0x07
			]);

			expect(() => decodeMintMemo(memo)).toThrow();
		});

		it('should reject a signature that is not 64 bytes long', () => {
			const memo = Uint8Array.from([
				0x82,
				0x00,
				0x81,
				0x82,
				0x01,
				0x82,
				0x58,
				0x3f,
				...new Uint8Array(63),
				0x07
			]);

			expect(() => decodeMintMemo(memo)).toThrow();
		});
	});

	describe('decodeBurnMemo', () => {
		const addressBytes = getBase58Encoder().encode(mockSolAddress);

		it('should decode the Solana address of a withdrawal', () => {
			const { toAddress } = decodeBurnMemo(mockCkSolBurnMemo(mockSolAddress));

			expect(getBase58Decoder().decode(toAddress)).toBe(mockSolAddress);
		});

		it('should reject a mint memo', () => {
			expect(() => decodeBurnMemo(mockCkSolMintMemo())).toThrow();
		});

		it('should reject another burn variant', () => {
			const memo = Uint8Array.from([
				0x82,
				0x01,
				0x81,
				0x82,
				0x01,
				0x81,
				0x58,
				0x20,
				...addressBytes
			]);

			expect(() => decodeBurnMemo(memo)).toThrow();
		});

		it('should reject an address that is not 32 bytes long', () => {
			const memo = Uint8Array.from([
				0x82,
				0x01,
				0x81,
				0x82,
				0x00,
				0x81,
				0x58,
				0x1f,
				...addressBytes.slice(0, 31)
			]);

			expect(() => decodeBurnMemo(memo)).toThrow();
		});

		it('should reject a memo that is not CBOR', () => {
			expect(() => decodeBurnMemo(Uint8Array.from([0xff]))).toThrow();
		});
	});
});
