import type { IcrcTransaction, IcTransactionUi } from '$icp/types/ic';
import {
	decodeBurnMemo,
	decodeMintMemo,
	MINT_MEMO_TYPE_KYT_FAIL
} from '$icp/utils/ckbtc-minter.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { OptionIdentity } from '$lib/types/identity';
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

		const isReimbursement = nonNullish(memo) && isCkbtcReimbursementMintMemo(memo);

		return {
			...tx,
			toLabel: 'BTC Network',
			typeLabel: isReimbursement ? 'Reimbursement' : 'BTC Received',
			status: isReimbursement ? 'reimbursed' : 'executed'
		};
	}

	if (isBurn) {
		const memo = fromNullable(fromNullable(burn)!.memo) ?? [];

		const burnMemo = burnMemoLabel(memo);

		return {
			...tx,
			...burnStatus(retrieveBtcStatus),
			toLabel: burnMemo ?? 'BTC Network'
		};
	}

	return tx;
};

const burnStatus = (
	retrieveBtcStatus: RetrieveBtcStatusV2 | undefined
): Required<Pick<IcTransactionUi, 'typeLabel'>> & Pick<IcTransactionUi, 'status'> => {
	if (nonNullish(retrieveBtcStatus)) {
		if ('Reimbursed' in retrieveBtcStatus || 'AmountTooLow' in retrieveBtcStatus) {
			return {
				typeLabel: 'Sending BTC failed',
				status: 'failed'
			};
		} else if (
			'Pending' in retrieveBtcStatus ||
			'Signing' in retrieveBtcStatus ||
			'Sending' in retrieveBtcStatus ||
			'Submitted' in retrieveBtcStatus ||
			'WillReimburse' in retrieveBtcStatus
		) {
			return {
				typeLabel: 'Sending BTC',
				status: 'pending'
			};
		} else if (!('Confirmed' in retrieveBtcStatus)) {
			console.error('Unknown retrieveBtcStatusV2:', retrieveBtcStatus);
		}
	}

	return {
		typeLabel: 'BTC Sent',
		status: 'executed'
	};
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

export const burnMemoLabel = (memo: Uint8Array | number[]): string | undefined | null => {
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
