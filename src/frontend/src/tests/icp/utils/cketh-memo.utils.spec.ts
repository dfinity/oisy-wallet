import {
	BURN_MEMO_CONVERT,
	BURN_MEMO_ERC20_CONVERT,
	BURN_MEMO_ERC20_GAS_FEE,
	decodeBurnMemo,
	decodeMintMemo,
	MINT_MEMO_CONVERT,
	MINT_MEMO_REIMBURSE_TRANSACTION,
	MINT_MEMO_REIMBURSE_WITHDRAWAL
} from '$icp/utils/cketh-memo.utils';
import { Cbor } from '@dfinity/agent';
import {
	arrayBufferToUint8Array,
	hexStringToUint8Array,
	uint8ArrayToHexString
} from '@dfinity/utils';

describe('cketh-memo.utils', () => {
	describe('decode mint memo', () => {
		it('should decode memo to convert', () => {
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
			expect(uint8ArrayToHexString(tx_hash as Uint8Array)).toEqual(
				'705f826861c802b407843e99af986cfde8749b669e5e0a5a150f4350bcaa9bc3'
			);
			expect(log_index).toEqual(39);
		});

		it('should decode memo to reimbursement transaction', () => {
			const memo = new Uint8Array([
				130, 1, 130, 25, 4, 210, 88, 32, 112, 95, 130, 104, 97, 200, 2, 180, 7, 132, 62, 153, 175,
				152, 108, 253, 232, 116, 155, 102, 158, 94, 10, 90, 21, 15, 67, 80, 188, 170, 155, 195
			]);

			const [type, values] = decodeMintMemo(memo);

			expect(type).toEqual(MINT_MEMO_REIMBURSE_TRANSACTION);

			const [withdrawalId, from_address] = values;

			expect(withdrawalId).toEqual(1234);
			expect(uint8ArrayToHexString(from_address as Uint8Array)).toEqual(
				'705f826861c802b407843e99af986cfde8749b669e5e0a5a150f4350bcaa9bc3'
			);
		});

		it('should decode memo to reimbursement withdrawal', () => {
			const memo = arrayBufferToUint8Array(Cbor.encode([2, [1234]]));

			const [type, values] = decodeMintMemo(memo);

			expect(type).toEqual(MINT_MEMO_REIMBURSE_WITHDRAWAL);

			const [withdrawalId] = values;

			expect(withdrawalId).toEqual(1234);
		});
	});

	describe('decode burn memo', () => {
		it('should decode ckETH memo to withdrawal', () => {
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

		it('should decode ckErc20 memo to gas fee', () => {
			const memo = new Uint8Array([
				130, 1, 131, 109, 99, 107, 83, 101, 112, 111, 108, 105, 97, 85, 83, 68, 67, 26, 0, 1, 212,
				192, 84, 95, 171, 95, 123, 39, 155, 165, 64, 189, 84, 231, 160, 196, 105, 83, 166, 26, 213,
				200, 43
			]);

			const [type, values] = decodeBurnMemo(memo);

			expect(type).toEqual(BURN_MEMO_ERC20_GAS_FEE);

			const [ckerc20_token_symbol, ckerc20_withdrawal_amount, to_address] = values;

			expect(ckerc20_token_symbol).toEqual('ckSepoliaUSDC');
			expect(ckerc20_withdrawal_amount).toEqual(120000);
			expect(uint8ArrayToHexString(to_address as Uint8Array)).toEqual(
				'5fab5f7b279ba540bd54e7a0c46953a61ad5c82b'
			);
		});

		it('should decode ckErc20 memo to convert', () => {
			const memo = arrayBufferToUint8Array(
				Cbor.encode([
					2,
					[
						1234,
						hexStringToUint8Array(
							'705f826861c802b407843e99af986cfde8749b669e5e0a5a150f4350bcaa9bc3'
						)
					]
				])
			);

			const [type, values] = decodeBurnMemo(memo);

			expect(type).toEqual(BURN_MEMO_ERC20_CONVERT);

			const [withdrawalId, from_address] = values;

			expect(withdrawalId).toEqual(1234);
			expect(uint8ArrayToHexString(from_address as Uint8Array)).toEqual(
				'705f826861c802b407843e99af986cfde8749b669e5e0a5a150f4350bcaa9bc3'
			);
		});
	});
});
