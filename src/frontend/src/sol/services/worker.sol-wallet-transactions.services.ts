import type { SolAddress } from '$lib/types/address';
import type { WalletWorker } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';
import type {
	PostMessage,
	PostMessageDataRequestSolTransactions,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Token } from '$lib/types/token';
import {
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdSOLTestnet
} from '$lib/utils/network.utils';
import {
	syncWalletTransactions,
	syncWalletTransactionsError
} from '$sol/services/sol-listener.services';
import type { SolPostMessageDataResponseWalletTransactions } from '$sol/types/sol-post-message';
import type { SplToken } from '$sol/types/spl';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { assertNonNullish } from '@dfinity/utils';

export const initSolWalletTransactionsWorker = async ({
	address,
	networkId,
	tokens
}: {
	address: CertifiedData<SolAddress>;
	networkId: NetworkId;
	tokens: Token[];
}): Promise<WalletWorker> => {
	const WalletWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new WalletWorker.default();

	const isMainnetNetwork = isNetworkIdSOLMainnet(networkId);
	const isTestnetNetwork = isNetworkIdSOLTestnet(networkId);
	const isDevnetNetwork = isNetworkIdSOLDevnet(networkId);
	const isLocalNetwork = isNetworkIdSOLLocal(networkId);

	worker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<SolPostMessageDataResponseWalletTransactions>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncSolWalletTransactions':
				await syncWalletTransactions({
					address,
					tokens,
					data: data.data as SolPostMessageDataResponseWalletTransactions
				});
				return;

			case 'syncSolWalletTransactionsError':
				syncWalletTransactionsError({
					error: (data.data as PostMessageDataResponseError).error,
					// TODO: Remove "isMainnetNetwork" after the issue with SOL wallet is investigated and fixed
					hideToast: isTestnetNetwork || isDevnetNetwork || isLocalNetwork || isMainnetNetwork
				});
				return;
		}
	};

	assertNonNullish(address, 'No Solana address provided to start Solana wallet worker.');

	const network = mapNetworkIdToNetwork(networkId);
	assertNonNullish(network, 'No Solana network provided to start Solana wallet worker.');

	const tokensList: Pick<SplToken, 'address' | 'owner'>[] = tokens.reduce<
		Pick<SplToken, 'address' | 'owner'>[]
	>(
		(acc, token) => [
			...acc,
			...(isTokenSpl(token)
				? [
						{
							address: token.address,
							owner: token.owner
						}
					]
				: [])
		],
		[]
	);

	const data: PostMessageDataRequestSolTransactions = {
		address,
		solanaNetwork: network,
		tokensList
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startSolWalletTransactionsTimer',
				data
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopSolWalletTransactionsTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerSolWalletTransactionsTimer',
				data
			});
		}
	};
};
