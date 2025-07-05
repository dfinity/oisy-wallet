import { Cbor } from '@dfinity/agent';
import { arrayOfNumberToUint8Array } from '@dfinity/utils';
import * as z from 'zod/v4';

/// Mint

export class LegacyMintMemoError extends Error {}

// The minter converted a single UTXO to ckBTC.
export const MINT_MEMO_CONVERT = 0;
// The minter minted accumulated KYT fees to the KYT provider.
export const MINT_MEMO_KYT = 1;
// The minter failed to check retrieve btc destination address or the destination address is tainted.
export const MINT_MEMO_KYT_FAIL = 2;

const MintMemoConvert = z.tuple([
	z.literal(MINT_MEMO_CONVERT),
	z.tuple([z.instanceof(Uint8Array).nullish(), z.number().nullish(), z.number().nullish()])
]);

const MintMemoKyt = z.tuple([z.literal(MINT_MEMO_KYT)]);

const MintMemoKytFail = z.tuple([
	z.literal(MINT_MEMO_KYT_FAIL),
	z.tuple([z.number().nullish(), z.number().nullish(), z.number().nullish()])
]);

// Source: https://github.com/dfinity/ic/blob/c22a5aebd4f26ae2e4016de55e3f7aa00d086479/rs/bitcoin/ckbtc/minter/src/memo.rs#L25
const MintMemoSchema = MintMemoConvert.or(MintMemoKyt.or(MintMemoKytFail));

export type MintMemo = z.infer<typeof MintMemoSchema>;

/**
 * Helper that decodes the memo of a ckBTC mint transaction to an object.
 *
 * @param memo a Cbor encoded memo.
 * @throws LegacyMintMemoError when the memo length is 0 or 32 which identifying a legacy memo which are not supported by this help.
 * @returns {MintMemo} the decoded memo object.
 */
export const decodeMintMemo = (memo: Uint8Array | number[]): MintMemo => {
	// Legacy minting transaction have a memo of length 0 or 32.
	// We ignore them - those are not supported by this decoder.
	if (memo.length === 0 || memo.length === 32) {
		throw new LegacyMintMemoError();
	}

	return MintMemoSchema.parse(Cbor.decode(new Uint8Array(memo)));
};

/// Burn

// The minter processed a retrieve_btc request.
export const BURN_MEMO_CONVERT = 0;

enum BurnMemoStatus {
	Accepted,
	Rejected,
	CallFailed
}

const BurnMemoConvert = z.tuple([
	z.literal(BURN_MEMO_CONVERT),
	z.tuple([z.string().nullish(), z.number().nullish(), z.nativeEnum(BurnMemoStatus).nullish()])
]);

// Source: https://github.com/dfinity/ic/blob/c22a5aebd4f26ae2e4016de55e3f7aa00d086479/rs/bitcoin/ckbtc/minter/src/memo.rs#L25
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
