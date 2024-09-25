import { syncWallet } from '$btc/services/btc-listener.services';
import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$icp/utils/ic-send.utils';
import type { WalletWorker } from '$lib/types/listener';
import type { PostMessage, PostMessageDataResponseBtcWallet } from '$lib/types/post-message';
import type { Token } from '$lib/types/token';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';

export const initBtcWalletWorker = async ({
	id: tokenId,
	network: { id: networkId }
}: Token): Promise<WalletWorker> => {
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
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startBtcWalletTimer',
				data: {
					bitcoinNetwork: mapToSignerBitcoinNetwork({
						network: isNetworkIdBTCTestnet(networkId)
							? 'testnet'
							: isNetworkIdBTCRegtest(networkId)
								? 'regtest'
								: 'mainnet'
					})
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
