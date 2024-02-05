import type { IcrcTransaction, IcTransactionUi } from '$icp/types/ic';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { OptionIdentity } from '$lib/types/identity';
import { Cbor } from '@dfinity/agent';
import type { RetrieveBtcStatusV2 } from '@dfinity/ckbtc';
import { arrayOfNumberToUint8Array, fromNullable, nonNullish } from '@dfinity/utils';

export const mapCkBTCTransaction = ({
	transaction,
	identity,
	retrieveBtcStatus
}: {
	transaction: IcrcTransaction;
	identity: OptionIdentity;
	retrieveBtcStatus?: RetrieveBtcStatusV2;
}): IcTransactionUi => {
	const tx = mapIcrcTransaction({ transaction, identity });

	const { transaction: rawTransaction } = transaction;

	const { mint, burn } = rawTransaction;

	const isMint = nonNullish(fromNullable(mint));
	const isBurn = nonNullish(fromNullable(burn));

	if (isMint) {
		const memo = fromNullable(fromNullable(mint)!.memo);

		return {
			...tx,
			toLabel: 'BTC Network',
			typeLabel:
				nonNullish(memo) && isCkbtcReimbursementMintMemo(memo) ? 'Reimbursement' : 'BTC Received'
		};
	}

	if (isBurn) {
		const memo = fromNullable(fromNullable(burn)!.memo) ?? [];

		const burnMemo = burnMemoLabel(memo);

		return {
			...tx,
			typeLabel: burnDescription(retrieveBtcStatus),
			toLabel: burnMemo ?? 'BTC Network'
		};
	}

	return tx;
};

const burnDescription = (retrieveBtcStatus: RetrieveBtcStatusV2 | undefined): string => {
	if (nonNullish(retrieveBtcStatus)) {
		if ('Reimbursed' in retrieveBtcStatus || 'AmountTooLow' in retrieveBtcStatus) {
			return 'Sending BTC failed';
			// status failed?
		} else if (
			'Pending' in retrieveBtcStatus ||
			'Signing' in retrieveBtcStatus ||
			'Sending' in retrieveBtcStatus ||
			'Submitted' in retrieveBtcStatus ||
			'WillReimburse' in retrieveBtcStatus
		) {
			return 'Sending BTC';
			// status pending?
		} else if (!('Confirmed' in retrieveBtcStatus)) {
			console.error('Unknown retrieveBtcStatusV2:', retrieveBtcStatus);
			// Leave the transaction as "Sent".
		}
	}

	return 'BTC Sent';
};

const isCkbtcReimbursementMintMemo = (memo: Uint8Array | number[]) => {
	try {
		const [mintType, _] = decodeMintMemo(memo);
		return mintType === MINT_MEMO_TYPE_KYT_FAIL;
	} catch (err) {
		console.error('Failed to decode ckBTC mint memo', memo, err);
		return false;
	}
};

export const burnMemoLabel = (memo: Uint8Array | number[]): string | undefined => {
	try {
		const [_, [label]] = decodeBurnMemo(
			memo instanceof Uint8Array ? memo : arrayOfNumberToUint8Array(memo)
		);
		return label;
	} catch (err: unknown) {
		console.error('Failed to decode ckBTC burn memo', memo, err);
		return undefined;
	}
};

// TODO: replace with ic-js PR https://github.com/dfinity/ic-js/pull/535

// The minter converted a single UTXO to ckBTC.
export const MINT_MEMO_TYPE_UTXO_TO_CKBTC = 0;
// The minter minted accumulated KYT fees to the KYT provider.
export const MINT_MEMO_TYPE_ACCUMULATED_KYT_FEES = 1;
// The minter failed to check retrieve btc destination address or the destination address is tainted.
export const MINT_MEMO_TYPE_KYT_FAIL = 2;

// The memo will decode to either:
// * Convert: [0, [ tx_id, vout, kyt_fee]]
// * Kyt: [1]
// * KytFail: [2, [ kyt_fee, kyt_status, block_index]]
// Source: https://github.com/dfinity/ic/blob/c22a5aebd4f26ae2e4016de55e3f7aa00d086479/rs/bitcoin/ckbtc/minter/src/memo.rs#L25
export type MintMemo =
	| [typeof MINT_MEMO_TYPE_UTXO_TO_CKBTC, [Uint8Array?, number?, number?]]
	| [typeof MINT_MEMO_TYPE_ACCUMULATED_KYT_FEES]
	| [typeof MINT_MEMO_TYPE_KYT_FAIL, [number, number?, number?]];

export class LegacyMintMemoError extends Error {}

export const decodeMintMemo = (memo: Uint8Array | number[]): MintMemo => {
	// Legacy minting transaction have a memo of length 0 or 32.
	// We ignore them - those are not supported by this decoder.
	if (memo.length === 0 || memo.length === 32) {
		throw new LegacyMintMemoError();
	}

	return Cbor.decode(new Uint8Array(memo)) as MintMemo;
};

// TODO: to be implemented in ic-js

// The memo will decode to: [0, [ withdrawalAddress, kytFee, status]]
type CkbtcBurnMemo = [0, [string, number, number | null | undefined]];

const decodeBurnMemo = (memo: Uint8Array): CkbtcBurnMemo => Cbor.decode(memo) as CkbtcBurnMemo;
