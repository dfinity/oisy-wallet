import {
	CKETH_EXPLORER_URL,
	CKETH_SEPOLIA_EXPLORER_URL,
	ETHEREUM_EXPLORER_URL,
	SEPOLIA_EXPLORER_URL
} from '$env/explorers.env';
import {
	IC_CKETH_LEDGER_CANISTER_ID,
	STAGING_CKETH_LEDGER_CANISTER_ID
} from '$env/networks.icrc.env';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import type { IcToken, IcTransactionUi, IcrcTransaction } from '$icp/types/ic';
import {
	MINT_MEMO_REIMBURSE_TRANSACTION,
	MINT_MEMO_REIMBURSE_WITHDRAWAL,
	decodeBurnMemo,
	decodeMintMemo
} from '$icp/utils/cketh-memo.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import type { OptionIdentity } from '$lib/types/identity';
import type { Network } from '$lib/types/network';
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

	const ckETHExplorerUrl =
		IC_CKETH_LEDGER_CANISTER_ID === ledgerCanisterId && nonNullish(env)
			? env === 'testnet' && nonNullish(STAGING_CKETH_LEDGER_CANISTER_ID)
				? ledgerCanisterId !== STAGING_CKETH_LEDGER_CANISTER_ID
					? `${CKETH_SEPOLIA_EXPLORER_URL}/${ledgerCanisterId}`
					: CKETH_SEPOLIA_EXPLORER_URL
				: CKETH_EXPLORER_URL
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

	const ethExplorerUrl =
		IC_CKETH_LEDGER_CANISTER_ID === ledgerCanisterId ? ETHEREUM_EXPLORER_URL : SEPOLIA_EXPLORER_URL;

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
					: 'transaction.label.twin_token_received',
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
