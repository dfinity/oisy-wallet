import { Cbor } from '@dfinity/agent';
import { arrayOfNumberToUint8Array } from '@dfinity/utils';
import { z } from 'zod';

/// Mint

/// The minter received some ETH.
export const MINT_MEMO_CONVERT = 0;

export const MINT_MEMO_REIMBURSE = 1;

const MintMemoConvert = z.tuple([
	z.literal(MINT_MEMO_CONVERT),
	z.tuple([z.instanceof(Uint8Array), z.instanceof(Uint8Array), z.number()])
]);

const MintMemoReimburse = z.tuple([
	z.literal(MINT_MEMO_REIMBURSE),
	z.tuple([z.number(), z.instanceof(Uint8Array)])
]);

// Source: https://github.com/dfinity/ic/blob/c22a5aebd4f26ae2e4016de55e3f7aa00d086479/rs/ethereum/cketh/minter/src/memo.rs#L20
const MintMemoSchema = MintMemoConvert.or(MintMemoReimburse);

export type MintMemo = z.infer<typeof MintMemoSchema>;

/**
 * Helper that decodes the memo of a ckETH mint transaction to an object.
 *
 * @param memo a Cbor encoded memo.
 * @returns {MintMemo} the decoded memo object.
 */
export const decodeMintMemo = (memo: Uint8Array | number[]): MintMemo =>
	MintMemoSchema.parse(
		Cbor.decode(memo instanceof Uint8Array ? memo : arrayOfNumberToUint8Array(memo))
	);

/// Burn

// /// The minter processed a withdraw request.
export const BURN_MEMO_CONVERT = 0;

const BurnMemoConvert = z.tuple([
	z.literal(BURN_MEMO_CONVERT),
	z.tuple([z.instanceof(Uint8Array)])
]);

// Source: https://github.com/dfinity/ic/blob/c22a5aebd4f26ae2e4016de55e3f7aa00d086479/rs/ethereum/cketh/minter/src/memo.rs#L51
const BurnMemoSchema = BurnMemoConvert;

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
