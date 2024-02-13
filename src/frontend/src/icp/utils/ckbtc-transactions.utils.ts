import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { IcCertifiedTransaction } from '$icp/stores/ic-transactions.store';
import type { IcrcTransaction, IcTransactionUi } from '$icp/types/ic';
import { decodeBurnMemo, decodeMintMemo, MINT_MEMO_KYT_FAIL } from '$icp/utils/ckbtc-memo.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import { CKBTC_EXPLORER_URL } from '$lib/constants/explorers.constants';
import type { OptionIdentity } from '$lib/types/identity';
import type { PendingUtxo, RetrieveBtcStatusV2 } from '@dfinity/ckbtc';
import { fromNullable, isNullish, nonNullish, uint8ArrayToHexString } from '@dfinity/utils';

export const mapCkBTCTransaction = ({
	transaction,
	identity
}: {
	transaction: IcrcTransaction;
	identity: OptionIdentity;
}): IcTransactionUi => {
	const { id, ...txRest } = mapIcrcTransaction({ transaction, identity });

	const tx = {
		id,
		explorerUrl: `${CKBTC_EXPLORER_URL}/${id}`,
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
			...(nonNullish(toAddress) && { to: toAddress }),
			...(isNullish(toAddress) && { toLabel: 'BTC Network' })
		};
	}

	return tx;
};

export const mapCkBTCPendingUtxo = ({
	utxo,
	kytFee
}: {
	utxo: PendingUtxo;
	kytFee: bigint;
}): IcTransactionUi => ({
	id: `${uint8ArrayToHexString(Uint8Array.from(utxo.outpoint.txid))}-${utxo.outpoint.vout}`,
	incoming: true,
	type: 'receive',
	status: 'pending',
	fromLabel: 'BTC Network',
	typeLabel: 'Receiving BTC',
	value: utxo.value - kytFee
});

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

export const burnMemoAddress = (memo: Uint8Array | number[]): string | undefined | null => {
	try {
		const [_, [toAddress]] = decodeBurnMemo(memo);
		return toAddress;
	} catch (err: unknown) {
		console.error('Failed to decode ckBTC burn memo', memo, err);
		return undefined;
	}
};
