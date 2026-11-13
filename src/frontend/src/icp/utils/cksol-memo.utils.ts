import { Cbor } from '@icp-sdk/core/agent';
import * as z from 'zod';

// Source: https://github.com/dfinity/cksol/blob/cksol_minter-v0.1.0/libs/types/src/memo/mod.rs
//
// Unlike the ckBTC and ckETH minters, the ckSOL minter wraps its mint and burn memos in one
// enum, so a memo nests one level deeper: `[kind, [[variant, [fields]]]]`.

const MEMO_MINT = 0;

const MEMO_BURN = 1;

// The minter converted a deposit it swept to its main account.
const MINT_MEMO_SWEEP = 1;

// The minter burned ckSOL to start a withdrawal.
const BURN_MEMO_CONVERT = 0;

const MintMemoSchema = z
	.tuple([
		z.literal(MEMO_MINT),
		z.tuple([
			z.tuple([
				z.literal(MINT_MEMO_SWEEP),
				// The signature of the sweep transaction, and the minter's id for the deposit.
				z.tuple([
					z.instanceof(Uint8Array).refine(({ length }) => length === 64),
					z.union([z.number(), z.bigint()])
				])
			])
		])
	])
	.transform(([, [[, [signature]]]]) => ({ signature }));

export type MintMemo = z.infer<typeof MintMemoSchema>;

/**
 * Decodes the memo of a ckSOL mint, which the minter writes when it converts a deposit.
 *
 * @param memo a CBOR encoded memo.
 * @returns {MintMemo} the raw bytes of the signature of the Solana transaction that swept the deposit.
 */
export const decodeMintMemo = (memo: Uint8Array): MintMemo =>
	MintMemoSchema.parse(Cbor.decode(memo));

const BurnMemoSchema = z
	.tuple([
		z.literal(MEMO_BURN),
		z.tuple([
			z.tuple([
				z.literal(BURN_MEMO_CONVERT),
				// The Solana address the withdrawal pays out to.
				z.tuple([z.instanceof(Uint8Array).refine(({ length }) => length === 32)])
			])
		])
	])
	.transform(([, [[, [toAddress]]]]) => ({ toAddress }));

export type BurnMemo = z.infer<typeof BurnMemoSchema>;

/**
 * Decodes the memo of a ckSOL burn, which the minter writes when it burns ckSOL for a withdrawal.
 *
 * @param memo a CBOR encoded memo.
 * @returns {BurnMemo} the raw bytes of the Solana address the withdrawal pays out to.
 */
export const decodeBurnMemo = (memo: Uint8Array): BurnMemo =>
	BurnMemoSchema.parse(Cbor.decode(memo));
