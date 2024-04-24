import type { EthereumNetwork } from '$eth/types/network';
import { decodeErc20AbiDataValue, isErc20TransactionApprove } from '$eth/utils/transactions.utils';
import type { IcCkTwinToken, IcToken, IcTransactionUi } from '$icp/types/ic';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { Transaction } from '@ethersproject/transactions';
import { get } from 'svelte/store';

export const mapCkEthereumPendingTransaction = ({
	transaction: { hash, from, to, value, data },
	twinToken,
	token
}: {
	transaction: Transaction;
	token: IcToken;
} & IcCkTwinToken): IcTransactionUi => {
	const explorerUrl = (twinToken.network as EthereumNetwork).explorerUrl;

	const { symbol: twinTokenSymbol } = twinToken;
	const { symbol } = token;

	const erc20Approve = isErc20TransactionApprove(data);

	const {
		transaction: {
			label: { converting_twin_token }
		}
	} = get(i18n);

	return {
		id: `${hash}`,
		incoming: false,
		type: 'burn',
		status: 'pending',
		from,
		to,
		typeLabel: replacePlaceholders(converting_twin_token, {
			$token: twinTokenSymbol,
			$ckToken: symbol
		}),
		value: (erc20Approve ? decodeErc20AbiDataValue(data) : value).toBigInt(),
		fromExplorerUrl: `${explorerUrl}/address/${from}`,
		toExplorerUrl: `${explorerUrl}/address/${to}`,
		txExplorerUrl: `${explorerUrl}/tx/${hash}`
	};
};
