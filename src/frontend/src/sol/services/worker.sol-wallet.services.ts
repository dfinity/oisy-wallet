import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import type { WalletWorker } from '$lib/types/listener';
import type { PostMessage, PostMessageDataRequestSol } from '$lib/types/post-message';
import type { Token } from '$lib/types/token';
import { isNetworkIdSOLDevnet, isNetworkIdSOLLocal } from '$lib/utils/network.utils';
import {
	syncWallet,
	syncWalletError,
	syncWalletFromCache
} from '$sol/services/sol-listener.services';
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
	let worker: Worker | null = new WalletWorker.default();

	const isDevnetNetwork = isNetworkIdSOLDevnet(networkId);
	const isLocalNetwork = isNetworkIdSOLLocal(networkId);

	await syncWalletFromCache({ tokenId, networkId });

	worker.onmessage = ({
		data: dataMsg
	}: MessageEvent<PostMessage<SolPostMessageDataResponseWallet>>) => {
		const { msg, data } = dataMsg;

		switch (msg) {
			case 'syncSolWallet':
				syncWallet({
					tokenId,
					data: data as SolPostMessageDataResponseWallet
				});
				return;

			case 'syncSolWalletError':
				syncWalletError({
					tokenId,
					error: data.error,
					hideToast: true
				});
				return;
		}
	};

	// TODO: stop/start the worker on address change (same as for worker.btc-wallet.services.ts)
	const address = get(
		isDevnetNetwork
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

	const stop = () => {
		worker?.postMessage({
			msg: 'stopSolWalletTimer'
		});
	};

	let isDestroying = false;

	return {
		start: () => {
			worker?.postMessage({
				msg: 'startSolWalletTimer',
				data
			} as PostMessage<PostMessageDataRequestSol>);
		},
		stop,
		trigger: () => {
			worker?.postMessage({
				msg: 'triggerSolWalletTimer',
				data
			} as PostMessage<PostMessageDataRequestSol>);
		},
		destroy: () => {
			if (isDestroying) {
				return;
			}
			isDestroying = true;
			stop();
			worker?.terminate();
			worker = null;
			isDestroying = false;
		}
	};
};
