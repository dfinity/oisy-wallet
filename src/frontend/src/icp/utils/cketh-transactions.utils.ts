import type { IcrcTransaction, IcTransactionUi } from '$icp/types/ic';
import { decodeBurnMemo, decodeMintMemo, MINT_MEMO_REIMBURSE } from '$icp/utils/cketh-memo.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { OptionIdentity } from '$lib/types/identity';
import { fromNullable, nonNullish, uint8ArrayToHexString } from '@dfinity/utils';

export const mapCkETHTransaction = ({
	transaction,
	identity
}: {
	transaction: IcrcTransaction;
	identity: OptionIdentity;
}): IcTransactionUi => {
	const tx = mapIcrcTransaction({ transaction, identity });

	const { transaction: rawTransaction } = transaction;

	const { mint: rawMint, burn: rawBurn } = rawTransaction;

	const mint = fromNullable(rawMint);
	const burn = fromNullable(rawBurn);

	if (nonNullish(mint)) {
		const memo = fromNullable(mint.memo);

		const isReimbursement = nonNullish(memo) && isMemoReimbursement(memo);

		return {
			...tx,
			fromLabel: 'ETH Network',
			typeLabel: isReimbursement ? 'Reimbursement' : 'ETH Received',
			status: isReimbursement ? 'reimbursed' : 'executed'
		};
	}

	if (nonNullish(burn)) {
		const memo = fromNullable(burn.memo) ?? [];

		const burnMemo = burnMemoLabel(memo);

		return {
			...tx,
			typeLabel: "ETH Sent",
			toLabel: burnMemo ?? 'ETH Network'
		};
	}

	return tx;
};

const isMemoReimbursement = (memo: Uint8Array | number[]) => {
	try {
		const [mintType, _] = decodeMintMemo(memo);
		return mintType === MINT_MEMO_REIMBURSE;
	} catch (err: unknown) {
		console.error('Failed to decode ckETH mint memo', memo, err);
		return false;
	}
};

export const burnMemoLabel = (memo: Uint8Array | number[]): string | undefined | null => {
	try {
		const [_, [label]] = decodeBurnMemo(memo);
		return uint8ArrayToHexString(label);
	} catch (err: unknown) {
		console.error('Failed to decode ckETH burn memo', memo, err);
		return undefined;
	}
};
