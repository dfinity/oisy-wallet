import type { EthereumNetwork } from '$eth/types/network';
import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';
import type { IcCkLinkedAssets, IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { isNetworkIdETH, isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import type { OptionToken } from '$lib/types/token';
import type { EthersTransaction } from '$lib/types/transaction';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export type MapCkEthereumPendingTransactionParams = {
	transaction: EthersTransaction;
	token: IcToken;
} & IcCkLinkedAssets;

export const mapCkEthPendingTransaction = ({
	transaction: { value, ...transaction },
	...rest
}: MapCkEthereumPendingTransactionParams): IcTransactionUi =>
	mapPendingTransaction({
		transaction,
		value,
		...rest
	});

export const mapCkErc20PendingTransaction = ({
	transaction: { data, value, ...transaction },
	...rest
}: MapCkEthereumPendingTransactionParams): IcTransactionUi =>
	mapPendingTransaction({
		transaction,
		value: nonNullish(data) ? decodeCkErc20DepositAbiDataValue(data) : value,
		...rest
	});

const mapPendingTransaction = ({
	transaction: { hash, from, to },
	twinToken,
	token,
	value
}: {
	transaction: Omit<MapCkEthereumPendingTransactionParams['transaction'], 'value' | 'data'>;
	token: IcToken;
	value: bigint;
} & IcCkLinkedAssets): IcTransactionUi => {
	const { explorerUrl } = twinToken.network as EthereumNetwork;

	const { symbol: twinTokenSymbol } = twinToken;
	const { symbol } = token;

	const {
		transaction: {
			label: { converting_twin_token }
		}
	} = get(i18n);

	return {
		id: `${hash}`,
		incoming: true, // we mark this as incoming so we display a positive balance, as all pending mapped ckEth txs are incoming
		type: 'burn',
		status: 'pending',
		from,
		to,
		typeLabel: replacePlaceholders(converting_twin_token, {
			$token: twinTokenSymbol,
			$ckToken: symbol
		}),
		value,
		fromExplorerUrl: `${explorerUrl}/address/${from}`,
		toExplorerUrl: `${explorerUrl}/address/${to}`,
		txExplorerUrl: `${explorerUrl}/tx/${hash}`
	};
};

const decodeCkErc20DepositAbiDataValue = (data: string): bigint =>
	decodeErc20AbiDataValue({ data, bytesParam: true });

export const isConvertCkEthToEth = ({
	token,
	networkId
}: {
	token: OptionToken;
	networkId: NetworkId | undefined;
}) => nonNullish(token) && isNetworkIdETH(networkId) && isTokenCkEthLedger(token);

export const isConvertCkErc20ToErc20 = ({
	token,
	networkId
}: {
	token: OptionToken;
	networkId: NetworkId | undefined;
}) => nonNullish(token) && isNetworkIdETH(networkId) && isTokenCkErc20Ledger(token);
