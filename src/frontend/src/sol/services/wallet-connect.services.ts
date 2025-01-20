import { i18n } from '$lib/stores/i18n.store';
import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import {
	mapSolTransactionMessage,
	parseSolBase64TransactionMessage
} from '$sol/utils/sol-transactions.utils';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

interface WalletConnectDecodeTransactionParams {
	base64EncodedTransactionMessage: string;
	networkId: NetworkId;
}

export const decode = async ({
	base64EncodedTransactionMessage,
	networkId
}: WalletConnectDecodeTransactionParams) => {
	const solNetwork = mapNetworkIdToNetwork(networkId);

	assertNonNullish(
		solNetwork,
		replacePlaceholders(get(i18n).init.error.no_solana_network, {
			$network: networkId.description ?? ''
		})
	);

	const parsedTransactionMessage = await parseSolBase64TransactionMessage({
		transactionMessage: base64EncodedTransactionMessage,
		rpc: solanaHttpRpc(solNetwork)
	});

	return mapSolTransactionMessage(parsedTransactionMessage);
};
