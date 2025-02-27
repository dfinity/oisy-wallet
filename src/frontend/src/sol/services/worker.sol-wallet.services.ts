import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	solAddressTestnetStore
} from '$lib/stores/address.store';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataRequestSol,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { Token } from '$lib/types/token';
import {
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdSOLTestnet
} from '$lib/utils/network.utils';
import { syncWallet, syncWalletError } from '$sol/services/sol-listener.services';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const initSolWalletWorker = async ({ token }: { token: Token }): Promise<WalletWorker> => {
	const {
		id: tokenId,
		network: { id: networkId }
	} = token;

	const WalletWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new WalletWorker.default();

	const isMainnetNetwork = isNetworkIdSOLMainnet(networkId);
	const isTestnetNetwork = isNetworkIdSOLTestnet(networkId);
	const isDevnetNetwork = isNetworkIdSOLDevnet(networkId);
	const isLocalNetwork = isNetworkIdSOLLocal(networkId);

	worker.onmessage = ({ data }: MessageEvent<PostMessage<SolPostMessageDataResponseWallet>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncSolWallet':
				syncWallet({
					tokenId,
					data: data.data as SolPostMessageDataResponseWallet
				});
				return;

			case 'syncSolWalletError':
				syncWalletError({
					tokenId,
					error: (data.data as PostMessageDataResponseError).error,
					// TODO: Remove "isMainnetNetwork" after the issue with SOL wallet is investigated and fixed
					hideToast: isTestnetNetwork || isDevnetNetwork || isLocalNetwork || isMainnetNetwork
				});
				return;
		}
	};

	// TODO: stop/start the worker on address change (same as for worker.btc-wallet.services.ts)
	const address = get(
		isTestnetNetwork
			? solAddressTestnetStore
			: isDevnetNetwork
				? solAddressDevnetStore
				: isLocalNetwork
					? solAddressLocalnetStore
					: solAddressMainnetStore
	);
	assertNonNullish(address, 'No Solana address provided to start Solana wallet worker.');

	const network = mapNetworkIdToNetwork(token.network.id);
	assertNonNullish(network, 'No Solana network provided to start Solana wallet worker.');

	// If the token is an SPL token, we need to pass the token address and the owner address to the worker.
	// Otherwise, we pass undefined, which will be considered as the native SOLANA token.
	const { address: tokenAddress, owner: tokenOwnerAddress } = isTokenSpl(token)
		? token
		: { address: undefined, owner: undefined };

	const data: PostMessageDataRequestSol = {
		address,
		solanaNetwork: network,
		tokenAddress,
		tokenOwnerAddress
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startSolWalletTimer',
				data
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopSolWalletTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerSolWalletTimer',
				data
			});
		}
	};
};
