import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { IcCertifiedTransaction } from '$icp/stores/ic-transactions.store';
import type { IcrcTransaction, IcTransactionUi } from '$icp/types/ic';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { decodeBurnMemo, decodeMintMemo, MINT_MEMO_KYT_FAIL } from '$icp/utils/ckbtc-memo.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import { BITCOIN_EXPLORER_URL, CKBTC_EXPLORER_URL } from '$lib/constants/explorers.constants';
import type { OptionIdentity } from '$lib/types/identity';
import type { PendingUtxo, RetrieveBtcStatusV2 } from '@dfinity/ckbtc';
import { fromNullable, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

export const mapCkBTCTransaction = ({
	transaction,
	identity
}: {
	transaction: IcrcTransaction;
	identity: OptionIdentity;
}): IcTransactionUi => {
	const { id, from, to, ...txRest } = mapIcrcTransaction({ transaction, identity });

	const tx: IcTransactionUi = {
		id,
		from,
		to,
		...(notEmptyString(CKBTC_EXPLORER_URL) && {
			txExplorerUrl: `${CKBTC_EXPLORER_URL}/transaction/${id}`,
			...(notEmptyString(from) && { fromExplorerUrl: `${CKBTC_EXPLORER_URL}/account/${from}` }),
			...(notEmptyString(to) && { toExplorerUrl: `${CKBTC_EXPLORER_URL}/account/${to}` })
		}),
		...txRest
	};

	const { transaction: rawTransaction } = transaction;

	const { mint: rawMint, burn: rawBurn } = rawTransaction;

	const mint = fromNullable(rawMint);
	const burn = fromNullable(rawBurn);

	if (nonNullish(mint)) {
		const memo = fromNullable(mint.memo);

		const isReimbursement = nonNullish(memo) && isMemoReimbursement(memo);

		return {
			...tx,
			fromLabel: 'BTC Network',
			typeLabel: isReimbursement ? 'Reimbursement' : 'BTC Received',
			status: isReimbursement ? 'reimbursed' : 'executed'
		};
	}

	if (nonNullish(burn)) {
		const memo = fromNullable(burn.memo) ?? [];

		const toAddress = burnMemoAddress(memo);

		return {
			...tx,
			...(nonNullish(toAddress) && {
				to: toAddress,
				...(notEmptyString(BITCOIN_EXPLORER_URL) && {
					toExplorerUrl: `${BITCOIN_EXPLORER_URL}/address/${toAddress}`
				})
			}),
			...(isNullish(toAddress) && { toLabel: 'BTC Network' })
		};
	}

	return tx;
};

export const mapCkBTCPendingUtxo = ({
	utxo: {
		value,
		outpoint: { txid, vout }
	},
	kytFee
}: {
	utxo: PendingUtxo;
	kytFee: bigint;
}): IcTransactionUi => {
	const id = utxoTxIdToString(txid);

	return {
		id: `${id}-${vout}`,
		incoming: true,
		type: 'receive',
		status: 'pending',
		fromLabel: 'BTC Network',
		typeLabel: 'Receiving BTC',
		value: value - kytFee,
		...(notEmptyString(BITCOIN_EXPLORER_URL) && {
			txExplorerUrl: `${BITCOIN_EXPLORER_URL}/tx/${id}`
		})
	};
};

export const extendCkBTCTransaction = ({
	transaction: {
		data: { type: txType, id, ...rest },
		certified
	},
	btcStatuses
}: {
	transaction: IcCertifiedTransaction;
	btcStatuses: BtcStatusesData | undefined;
}): IcCertifiedTransaction => {
	const { data: statuses } = btcStatuses ?? { data: undefined };

	return {
		data: {
			id,
			type: txType,
			...rest,
			...(txType === 'burn' && burnStatus(statuses?.[`${id}`]))
		},
		certified
	};
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

const isMemoReimbursement = (memo: Uint8Array | number[]) => {
	try {
		const [mintType, _] = decodeMintMemo(memo);
		return mintType === MINT_MEMO_KYT_FAIL;
	} catch (err: unknown) {
		console.error('Failed to decode ckBTC mint memo', memo, err);
		return false;
	}
};

const burnMemoAddress = (memo: Uint8Array | number[]): string | undefined | null => {
	try {
		const [_, [toAddress]] = decodeBurnMemo(memo);
		return toAddress;
	} catch (err: unknown) {
		console.error('Failed to decode ckBTC burn memo', memo, err);
		return undefined;
	}
};
