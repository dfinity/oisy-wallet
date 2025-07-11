import { Cbor } from '@dfinity/agent';
import { arrayOfNumberToUint8Array } from '@dfinity/utils';
import * as z from 'zod/v4';

// Mint

// The minter received some ETH or ERC20.
export const MINT_MEMO_CONVERT = 0;

export const MINT_MEMO_REIMBURSE_TRANSACTION = 1;

export const MINT_MEMO_REIMBURSE_WITHDRAWAL = 2;

const MintMemoConvert = z.tuple([
	z.literal(MINT_MEMO_CONVERT),
	z.tuple([z.instanceof(Uint8Array), z.instanceof(Uint8Array), z.number()])
]);

const MintMemoReimburseTransaction = z.tuple([
	z.literal(MINT_MEMO_REIMBURSE_TRANSACTION),
	z.tuple([z.number(), z.instanceof(Uint8Array)])
]);

const MintMemoReimburseWithdrawal = z.tuple([
	z.literal(MINT_MEMO_REIMBURSE_WITHDRAWAL),
	z.tuple([z.number()])
]);

// Source: https://github.com/dfinity/ic/blob/641af2ede85e0543d9e907cd1d971bfa396c84b5/rs/ethereum/cketh/minter/src/memo.rs#L21
const MintMemoSchema = MintMemoConvert.or(MintMemoReimburseTransaction).or(
	MintMemoReimburseWithdrawal
);

export type MintMemo = z.infer<typeof MintMemoSchema>;

/**
 * Helper that decodes the memo of a ckETH or ckErc20 mint transaction to an object.
 *
 * @param memo a Cbor encoded memo.
 * @returns {MintMemo} the decoded memo object.
 */
export const decodeMintMemo = (memo: Uint8Array | number[]): MintMemo =>
	MintMemoSchema.parse(
		Cbor.decode(memo instanceof Uint8Array ? memo : arrayOfNumberToUint8Array(memo))
	);

// Burn

// The minter processed a withdrawal request.
export const BURN_MEMO_CONVERT = 0;

// The minter processed a ckERC20 withdrawal request and that burn pays the transaction fee.
export const BURN_MEMO_ERC20_GAS_FEE = 1;

// The minter processed a ckERC20 withdrawal request.
export const BURN_MEMO_ERC20_CONVERT = 2;

const BurnMemoConvert = z.tuple([
	z.literal(BURN_MEMO_CONVERT),
	z.tuple([z.instanceof(Uint8Array)])
]);

const BurnMemoErc20GasFee = z.tuple([
	z.literal(BURN_MEMO_ERC20_GAS_FEE),
	z.tuple([z.string(), z.number(), z.instanceof(Uint8Array)])
]);

const BurnMemoErc20Convert = z.tuple([
	z.literal(BURN_MEMO_ERC20_CONVERT),
	z.tuple([z.number(), z.instanceof(Uint8Array)])
]);

// Source: https://github.com/dfinity/ic/blob/641af2ede85e0543d9e907cd1d971bfa396c84b5/rs/ethereum/cketh/minter/src/memo.rs#L60
const BurnMemoSchema = BurnMemoConvert.or(BurnMemoErc20GasFee).or(BurnMemoErc20Convert);

export type BurnMemo = z.infer<typeof BurnMemoSchema>;

/**
 * Helper that decodes the memo of a ckBTC burn transaction to an object.
 *
 * @param memo a Cbor encoded memo.
 * @returns {BurnMemo} the decoded memo object.
 */
export const decodeBurnMemo = (memo: Uint8Array | number[]): BurnMemo =>
	BurnMemoSchema.parse(
		Cbor.decode(memo instanceof Uint8Array ? memo : arrayOfNumberToUint8Array(memo))
	);
