import {
	BTC_MAINNET_EXPLORER_URL,
	BTC_TESTNET_EXPLORER_URL,
	CKBTC_EXPLORER_URL,
	CKBTC_TESTNET_EXPLORER_URL
} from '$env/explorers.env';
import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { CkBtcPendingUtxosData } from '$icp/stores/ckbtc-utxos.store';
import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import type { IcCertifiedTransaction } from '$icp/stores/ic-transactions.store';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi, IcrcTransaction } from '$icp/types/ic-transaction';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { MINT_MEMO_KYT_FAIL, decodeBurnMemo, decodeMintMemo } from '$icp/utils/ckbtc-memo.utils';
import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import type { Token } from '$lib/types/token';
import type { PendingUtxo, RetrieveBtcStatusV2 } from '@dfinity/ckbtc';
import { fromNullable, isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

export const mapCkBTCTransaction = ({
	transaction,
	identity,
	ledgerCanisterId,
	env
}: {
	transaction: IcrcTransaction;
	identity: OptionIdentity;
} & Pick<IcToken, 'ledgerCanisterId'> &
	Partial<Pick<Network, 'env'>>): IcTransactionUi => {
	const { id, from, to, ...txRest } = mapIcrcTransaction({ transaction, identity });

	const ckBTCExplorerUrl =
		IC_CKBTC_LEDGER_CANISTER_ID === ledgerCanisterId && nonNullish(env)
			? env === 'testnet'
				? CKBTC_TESTNET_EXPLORER_URL
				: CKBTC_EXPLORER_URL
			: undefined;

	const tx: IcTransactionUi = {
		id,
		from,
		to,
		...(notEmptyString(ckBTCExplorerUrl) && {
			txExplorerUrl: `${ckBTCExplorerUrl}/transaction/${id}`,
			...(notEmptyString(from) && { fromExplorerUrl: `${ckBTCExplorerUrl}/account/${from}` }),
			...(notEmptyString(to) && { toExplorerUrl: `${ckBTCExplorerUrl}/account/${to}` })
		}),
		...txRest
	};

	const { transaction: rawTransaction } = transaction;

	const { mint: rawMint, burn: rawBurn } = rawTransaction;

	const mint = fromNullable(rawMint);
	const burn = fromNullable(rawBurn);

	const bitcoinExplorerUrl =
		IC_CKBTC_LEDGER_CANISTER_ID === ledgerCanisterId
			? BTC_MAINNET_EXPLORER_URL
			: BTC_TESTNET_EXPLORER_URL;

	if (nonNullish(mint)) {
		const memo = fromNullable(mint.memo);

		const isReimbursement = nonNullish(memo) && isMemoReimbursement(memo);

		return {
			...tx,
			fromLabel: 'transaction.label.twin_network',
			typeLabel: isReimbursement
				? 'transaction.label.reimbursement'
				: 'transaction.label.twin_token_converted',
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
				toExplorerUrl: `${bitcoinExplorerUrl}/address/${toAddress}`
			}),
			...(isNullish(toAddress) && { toLabel: 'transaction.label.twin_network' })
		};
	}

	return tx;
};

export const mapCkBTCPendingUtxo = ({
	utxo: {
		value,
		outpoint: { txid, vout }
	},
	kytFee,
	ledgerCanisterId
}: {
	utxo: PendingUtxo;
	kytFee: bigint;
} & Pick<IcToken, 'ledgerCanisterId'>): IcTransactionUi => {
	const id = utxoTxIdToString(txid);

	const bitcoinExplorerUrl =
		IC_CKBTC_LEDGER_CANISTER_ID === ledgerCanisterId
			? BTC_MAINNET_EXPLORER_URL
			: BTC_TESTNET_EXPLORER_URL;

	return {
		id: `${id}-${vout}`,
		incoming: true,
		type: 'receive',
		status: 'pending',
		fromLabel: 'transaction.label.twin_network',
		typeLabel: 'transaction.label.converting_twin_token',
		value: value - kytFee,
		txExplorerUrl: `${bitcoinExplorerUrl}/tx/${id}`
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
				typeLabel: 'transaction.label.sending_twin_token_failed',
				status: 'failed'
			};
		}

		if (
			'Pending' in retrieveBtcStatus ||
			'Signing' in retrieveBtcStatus ||
			'Sending' in retrieveBtcStatus ||
			'Submitted' in retrieveBtcStatus ||
			'WillReimburse' in retrieveBtcStatus
		) {
			return {
				typeLabel: 'transaction.label.sending_twin_token',
				status: 'pending'
			};
		}
	}

	// Force compiler error on unhandled cases based on leftover types
	const _: { Confirmed: { txid: Uint8Array | number[] } } | { Unknown: null } | undefined | never =
		retrieveBtcStatus;

	return {
		typeLabel: 'transaction.label.twin_token_sent',
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

const burnMemoAddress = (memo: Uint8Array | number[]): OptionString => {
	try {
		const [_, [toAddress]] = decodeBurnMemo(memo);
		return toAddress;
	} catch (err: unknown) {
		console.error('Failed to decode ckBTC burn memo', memo, err);
		return undefined;
	}
};

export const getCkBtcPendingUtxoTransactions = ({
	token,
	ckBtcMinterInfoStore,
	ckBtcPendingUtxosStore
}: {
	token: Token;
	ckBtcMinterInfoStore: CertifiedStoreData<CkBtcMinterInfoData>;
	ckBtcPendingUtxosStore: CertifiedStoreData<CkBtcPendingUtxosData>;
}) => {
	if (!isTokenCkBtcLedger(token)) {
		return [];
	}

	const kytFee = ckBtcMinterInfoStore?.[token.id]?.data.kyt_fee;

	if (isNullish(kytFee)) {
		return [];
	}

	return (ckBtcPendingUtxosStore?.[token.id]?.data ?? []).map((utxo) => ({
		data: mapCkBTCPendingUtxo({
			utxo,
			kytFee,
			ledgerCanisterId: (token as IcCkToken).ledgerCanisterId
		}),
		certified: false
	}));
};
