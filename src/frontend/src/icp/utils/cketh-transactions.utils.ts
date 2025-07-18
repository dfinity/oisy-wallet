import {
	CKETH_EXPLORER_URL,
	CKETH_SEPOLIA_EXPLORER_URL,
	ETHEREUM_EXPLORER_URL,
	SEPOLIA_EXPLORER_URL
} from '$env/explorers.env';
import {
	ICRC_LEDGER_CANISTER_TESTNET_IDS,
	STAGING_CKETH_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import type { IcPendingTransactionsData } from '$icp/stores/ic-pending-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi, IcrcTransaction } from '$icp/types/ic-transaction';
import {
	MINT_MEMO_REIMBURSE_TRANSACTION,
	MINT_MEMO_REIMBURSE_WITHDRAWAL,
	decodeBurnMemo,
	decodeMintMemo
} from '$icp/utils/cketh-memo.utils';
import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import {
	fromNullable,
	isNullish,
	nonNullish,
	notEmptyString,
	uint8ArrayToHexString
} from '@dfinity/utils';

export const mapCkEthereumTransaction = ({
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

	const ckETHExplorerUrl = nonNullish(env)
		? `${
				(env === 'testnet' && nonNullish(STAGING_CKETH_LEDGER_CANISTER_ID)) ||
				isTokenIcrcTestnet({ ledgerCanisterId })
					? CKETH_SEPOLIA_EXPLORER_URL
					: CKETH_EXPLORER_URL
			}${isTokenCkErc20Ledger({ ledgerCanisterId }) ? `/${ledgerCanisterId}` : ''}`
		: undefined;

	const tx: IcTransactionUi = {
		id,
		from,
		to,
		...(notEmptyString(ckETHExplorerUrl) && {
			txExplorerUrl: `${ckETHExplorerUrl}/transaction/${id}`,
			...(notEmptyString(from) && { fromExplorerUrl: `${ckETHExplorerUrl}/account/${from}` }),
			...(notEmptyString(to) && { toExplorerUrl: `${ckETHExplorerUrl}/account/${to}` })
		}),
		...txRest
	};

	const { transaction: rawTransaction } = transaction;

	const { mint: rawMint, burn: rawBurn } = rawTransaction;

	const mint = fromNullable(rawMint);
	const burn = fromNullable(rawBurn);

	const ethExplorerUrl = ICRC_LEDGER_CANISTER_TESTNET_IDS.includes(ledgerCanisterId)
		? SEPOLIA_EXPLORER_URL
		: ETHEREUM_EXPLORER_URL;

	if (nonNullish(mint)) {
		const memo = fromNullable(mint.memo);

		const memoInfo = nonNullish(memo) ? mintMemoInfo(memo) : undefined;

		const from =
			memoInfo?.fromAddress !== undefined
				? mapAddressStartsWith0x(memoInfo.fromAddress)
				: undefined;

		return {
			...tx,
			typeLabel:
				memoInfo?.reimbursement === true
					? 'transaction.label.reimbursement'
					: 'transaction.label.twin_token_converted',
			...(nonNullish(from) && {
				from,
				fromExplorerUrl: `${ethExplorerUrl}/address/${from}`
			}),
			...(isNullish(memoInfo?.fromAddress) && { fromLabel: 'transaction.label.twin_network' }),
			status: memoInfo?.reimbursement === true ? 'reimbursed' : 'executed'
		};
	}

	if (nonNullish(burn)) {
		const memo = fromNullable(burn.memo) ?? [];

		const burnMemo = burnMemoInfo(memo);

		const to =
			burnMemo?.toAddress !== undefined ? mapAddressStartsWith0x(burnMemo.toAddress) : undefined;

		return {
			...tx,
			typeLabel: 'transaction.label.twin_token_sent',
			...(notEmptyString(to) && {
				to,
				toExplorerUrl: `${ethExplorerUrl}/address/${to}`
			}),
			...(isNullish(burnMemo?.toAddress) && { toLabel: 'transaction.label.twin_network' })
		};
	}

	return tx;
};

const mintMemoInfo = (
	memo: Uint8Array | number[]
): { fromAddress: string | undefined; reimbursement: boolean } | undefined => {
	try {
		const [mintType, [fromAddress]] = decodeMintMemo(memo);
		return {
			fromAddress:
				fromAddress instanceof Uint8Array ? uint8ArrayToHexString(fromAddress) : undefined,
			reimbursement: [MINT_MEMO_REIMBURSE_TRANSACTION, MINT_MEMO_REIMBURSE_WITHDRAWAL].includes(
				mintType
			)
		};
	} catch (err: unknown) {
		console.error('Failed to decode ckETH mint memo', memo, err);
		return undefined;
	}
};

const burnMemoInfo = (
	memo: Uint8Array | number[]
): { toAddress: string | undefined } | undefined => {
	try {
		const [_, [toAddress]] = decodeBurnMemo(memo);
		return {
			toAddress: toAddress instanceof Uint8Array ? uint8ArrayToHexString(toAddress) : undefined
		};
	} catch (err: unknown) {
		console.error('Failed to decode ckETH burn memo', memo, err);
		return undefined;
	}
};

export const getCkEthPendingTransactions = ({
	token,
	icPendingTransactionsStore
}: {
	token: Token;
	icPendingTransactionsStore: CertifiedStoreData<IcPendingTransactionsData>;
}) => {
	if (!isTokenCkEthLedger(token) && !isTokenCkErc20Ledger(token)) {
		return [];
	}

	return icPendingTransactionsStore?.[token.id] ?? [];
};
