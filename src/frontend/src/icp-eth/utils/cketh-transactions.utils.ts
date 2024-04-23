import type { EthereumNetwork } from '$eth/types/network';
import type { IcCkTwinToken, IcTransactionUi } from '$icp/types/ic';
import type { Transaction } from '$lib/types/transaction';

export const mapCkEthereumPendingTransaction = ({
	transaction: { hash, from, to, value },
	twinToken
}: {
	transaction: Transaction;
} & IcCkTwinToken): IcTransactionUi => {
	const explorerUrl = (twinToken.network as EthereumNetwork).explorerUrl;

	return {
		id: `${hash}`,
		incoming: false,
		type: 'burn',
		status: 'pending',
		from,
		to,
		typeLabel: 'Converting ETH to ckETH',
		value: value.toBigInt(),
		fromExplorerUrl: `${explorerUrl}/address/${from}`,
		toExplorerUrl: `${explorerUrl}/address/${to}`,
		txExplorerUrl: `${explorerUrl}/tx/${hash}`
	};
};
