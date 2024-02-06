import { Cbor } from '@dfinity/agent';
import { z } from 'zod';

export class LegacyMintMemoError extends Error {}

// The minter converted a single UTXO to ckBTC.
export const MINT_MEMO_TYPE_UTXO_TO_CKBTC = 0;
// The minter minted accumulated KYT fees to the KYT provider.
export const MINT_MEMO_TYPE_ACCUMULATED_KYT_FEES = 1;
// The minter failed to check retrieve btc destination address or the destination address is tainted.
export const MINT_MEMO_TYPE_KYT_FAIL = 2;

const MintMemoUtxoToCkBTC = z.tuple([
	z.literal(MINT_MEMO_TYPE_UTXO_TO_CKBTC),
	z.tuple([z.instanceof(Uint8Array).nullish(), z.number().nullish(), z.number().nullish()])
]);

const MintMemoAccumulatedKytFees = z.tuple([z.literal(MINT_MEMO_TYPE_ACCUMULATED_KYT_FEES)]);

const MintMemoTypeKytFail = z.tuple([
	z.literal(MINT_MEMO_TYPE_KYT_FAIL),
	z.tuple([z.number().nullish(), z.number().nullish(), z.number().nullish()])
]);

// Source: https://github.com/dfinity/ic/blob/c22a5aebd4f26ae2e4016de55e3f7aa00d086479/rs/bitcoin/ckbtc/minter/src/memo.rs#L25
const MintMemoSchema = MintMemoUtxoToCkBTC.or(MintMemoAccumulatedKytFees.or(MintMemoTypeKytFail));

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

// The minter processed a retrieve_btc request.
export const BURN_MEMO_TYPE_RETRIEVE_BTC = 0;

enum BurnMemoStatus {
	Accepted,
	Rejected,
	CallFailed
}

const BurnMemoRetrieveBTC = z.tuple([
	z.literal(BURN_MEMO_TYPE_RETRIEVE_BTC),
	z.tuple([z.string().nullish(), z.number().nullish(), z.nativeEnum(BurnMemoStatus).nullish()])
]);

// Source: https://github.com/dfinity/ic/blob/c22a5aebd4f26ae2e4016de55e3f7aa00d086479/rs/bitcoin/ckbtc/minter/src/memo.rs#L25
const BurnMemoSchema = BurnMemoRetrieveBTC;

export type BurnMemo = z.infer<typeof BurnMemoSchema>;

/**
 * Helper that decodes the memo of a ckBTC burn transaction to an object.
 *
 * @param memo a Cbor encoded memo.
 * @returns {BurnMemo} the decoded memo object.
 */
export const decodeBurnMemo = (memo: Uint8Array): BurnMemo =>
	BurnMemoSchema.parse(Cbor.decode(memo));
