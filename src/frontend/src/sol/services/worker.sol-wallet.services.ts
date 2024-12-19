import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	solAddressTestnetStore
} from '$lib/stores/address.store';
import type { WalletWorker } from '$lib/types/listener';
import type { PostMessage, PostMessageDataResponseError } from '$lib/types/post-message';
import type { Token } from '$lib/types/token';
import {
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLTestnet
} from '$lib/utils/network.utils';
import { syncWallet, syncWalletError } from '$sol/services/sol-listener.services';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const initSolWalletWorker = async ({ token }: { token: Token }): Promise<WalletWorker> => {
	const {
		id: tokenId,
		network: { id: networkId }
	} = token;

	const WalletWorker = await import('./sol-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	const isTestnetNetwork = isNetworkIdSOLTestnet(networkId);
	const isDevnetNetwork = isNetworkIdSOLDevnet(networkId);
	const isLocalNetwork = isNetworkIdSOLLocal(networkId);

	worker.onerror = (error) => {
		console.error('Worker error:', error);
	};

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
					hideToast: isTestnetNetwork || isDevnetNetwork || isLocalNetwork
				});
				return;
		}
	};

	// TODO: stop/start the worker on address change
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

	const data: PostMessageDataRequestSol = { address, tokenId };

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
