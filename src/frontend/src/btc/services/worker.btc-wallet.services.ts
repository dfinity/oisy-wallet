import { syncWallet } from '$btc/services/btc-listener.services';
import type { BtcToken } from '$btc/types/btc';
import { isNetworkIdBTCMainnet, isNetworkIdBTCTestnet } from '$icp/utils/ic-send.utils';
import type { PostMessage, PostMessageDataResponseBtcWallet } from '$lib/types/post-message';
import type { WalletWorker } from '$lib/types/wallet';

export const initBtcWalletWorker = async ({
	id: tokenId,
	network: { id: networkId }
}: BtcToken): Promise<WalletWorker> => {
	const WalletWorker = await import('$btc/workers/btc-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageDataResponseBtcWallet>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcWallet':
				syncWallet({
					tokenId,
					data: data.data as PostMessageDataResponseBtcWallet
				});
				return;
			case 'syncBtcWalletError':
				return;
			case 'syncBtcWalletCleanUp':
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startBtcWalletTimer',
				data: {
					bitcoinNetwork: isNetworkIdBTCMainnet(networkId)
						? 'mainnet'
						: isNetworkIdBTCTestnet(networkId)
							? 'testnet'
							: 'regtest'
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
