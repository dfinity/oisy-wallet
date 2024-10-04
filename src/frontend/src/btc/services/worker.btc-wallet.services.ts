import { syncWallet } from '$btc/services/btc-listener.services';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore
} from '$lib/stores/address.store';
import type { WalletWorker } from '$lib/types/listener';
import type { PostMessage, PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { Token } from '$lib/types/token';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	mapToSignerBitcoinNetwork
} from '$lib/utils/network.utils';
import { get } from 'svelte/store';

export const initBtcWalletWorker = async ({
	id: tokenId,
	network: { id: networkId }
}: Token): Promise<WalletWorker> => {
	const WalletWorker = await import('$btc/workers/btc-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	worker.onmessage = async ({ data }: MessageEvent<PostMessage<PostMessageDataResponseWallet>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcWallet':
				syncWallet({
					tokenId,
					data: data.data as PostMessageDataResponseWallet
				});
				return;
		}
	};

	return {
		start: () => {
			const isTestnetNetwork = isNetworkIdBTCTestnet(networkId);
			const isRegtestNetwork = isNetworkIdBTCRegtest(networkId);

			worker.postMessage({
				msg: 'startBtcWalletTimer',
				data: {
					// TODO: stop/start the worker on address change
					btcAddress: get(
						isTestnetNetwork
							? btcAddressTestnetStore
							: isRegtestNetwork
								? btcAddressRegtestStore
								: btcAddressMainnetStore
					),
					bitcoinNetwork: mapToSignerBitcoinNetwork({
						network: isTestnetNetwork ? 'testnet' : isRegtestNetwork ? 'regtest' : 'mainnet'
					}),
					// only mainnet transactions can be fetched via Blockchain API
					shouldFetchTransactions: isNetworkIdBTCMainnet(networkId)
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopBtcWalletTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerBtcWalletTimer'
			});
		}
	};
};
