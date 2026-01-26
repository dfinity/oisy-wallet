import { decodeBurnMemo, decodeMintMemo, LegacyMintMemoError } from '$icp/utils/ckbtc-memo.utils';
import { hexStringToUint8Array } from '@dfinity/utils';
import { Cbor } from '@icp-sdk/core/agent';

describe('ckbtc-memo.utils', () => {
	describe('decode mint memo', () => {
		it('should decode memo as a kyt fail', () => {
			const kytFee = 1331;
			const decodedMemo = [2, [kytFee, 1, 123]];
			const memo = new Uint8Array(Cbor.encode(decodedMemo));

			expect(decodeMintMemo(memo)).toEqual(decodedMemo);
		});

		it('should decode memo as a accumulated kyt', () => {
			const decodedMemo = [1];
			const memo = new Uint8Array(Cbor.encode(decodedMemo));

			expect(decodeMintMemo(memo)).toEqual(decodedMemo);
		});

		it('should decode memo as a converted single UTXO to ckBTC', () => {
			const btcWithdrawalAddress = hexStringToUint8Array('1ASLxsAMbbt4gcrNc6v6qDBW4JkeWAtTeh');
			const kytFee = 1333;
			const decodedMemo = [0, [btcWithdrawalAddress, kytFee, undefined]];
			const memo = new Uint8Array(Cbor.encode(decodedMemo));

			expect(decodeMintMemo(memo)).toEqual(decodedMemo);
		});

		it('should not decode legacy memo', () => {
			expect(() => decodeMintMemo(Uint8Array.from([]))).toThrowError(new LegacyMintMemoError());

			expect(() => decodeMintMemo(new Uint8Array(32))).toThrowError(new LegacyMintMemoError());
		});
	});

	describe('decode burn memo', () => {
		it('should decode memo as retrieve btc', () => {
			const decodedMemo = [0, ['abc', 1, 0]];
			const memo = new Uint8Array(Cbor.encode(decodedMemo));

			expect(decodeBurnMemo(memo)).toEqual(decodedMemo);
		});
	});
});
