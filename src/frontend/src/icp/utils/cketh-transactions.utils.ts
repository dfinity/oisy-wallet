import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import type { IcrcTransaction, IcTransactionUi } from '$icp/types/ic';
import { decodeBurnMemo, decodeMintMemo, MINT_MEMO_REIMBURSE } from '$icp/utils/cketh-memo.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import { CKETH_EXPLORER_URL } from '$lib/constants/explorers.constants';
import type { OptionIdentity } from '$lib/types/identity';
import { fromNullable, nonNullish, uint8ArrayToHexString } from '@dfinity/utils';

export const mapCkETHTransaction = ({
	transaction,
	identity
}: {
	transaction: IcrcTransaction;
	identity: OptionIdentity;
}): IcTransactionUi => {
	const { id, ...txRest } = mapIcrcTransaction({ transaction, identity });

	const tx = {
		id,
		explorerUrl: `${CKETH_EXPLORER_URL}/${id}`,
		...txRest
	};

	const { transaction: rawTransaction } = transaction;

	const { mint: rawMint, burn: rawBurn } = rawTransaction;

	const mint = fromNullable(rawMint);
	const burn = fromNullable(rawBurn);

	if (nonNullish(mint)) {
		const memo = fromNullable(mint.memo);

		const memoInfo = nonNullish(memo) ? mintMemoInfo(memo) : undefined;

		return {
			...tx,
			typeLabel: memoInfo?.reimbursement === true ? 'Reimbursement' : 'ETH Received',
			fromLabel:
				memoInfo?.fromAddress !== undefined
					? mapAddressStartsWith0x(memoInfo.fromAddress)
					: 'ETH Network',
			status: memoInfo?.reimbursement === true ? 'reimbursed' : 'executed'
		};
	}

	if (nonNullish(burn)) {
		const memo = fromNullable(burn.memo) ?? [];

		const burnMemo = burnMemoInfo(memo);

		return {
			...tx,
			typeLabel: 'ETH Sent',
			toLabel:
				burnMemo?.toAddress !== undefined
					? mapAddressStartsWith0x(burnMemo.toAddress)
					: 'ETH Network'
		};
	}

	return tx;
};

export const mintMemoInfo = (
	memo: Uint8Array | number[]
): { fromAddress: string | undefined; reimbursement: boolean } | undefined => {
	try {
		const [mintType, [fromAddress]] = decodeMintMemo(memo);
		return {
			fromAddress:
				fromAddress instanceof Uint8Array ? uint8ArrayToHexString(fromAddress) : undefined,
			reimbursement: mintType === MINT_MEMO_REIMBURSE
		};
	} catch (err: unknown) {
		console.error('Failed to decode ckETH mint memo', memo, err);
		return undefined;
	}
};

export const burnMemoInfo = (memo: Uint8Array | number[]): { toAddress: string } | undefined => {
	try {
		const [_, [toAddress]] = decodeBurnMemo(memo);
		return { toAddress: uint8ArrayToHexString(toAddress) };
	} catch (err: unknown) {
		console.error('Failed to decode ckETH burn memo', memo, err);
		return undefined;
	}
};
