import { syncWallet, syncWalletError } from '$btc/services/btc-listener.services';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { LOCAL } from '$lib/constants/app.constants';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore
} from '$lib/stores/address.store';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type { WalletWorker } from '$lib/types/listener';
import type { PostMessage, PostMessageDataResponseError } from '$lib/types/post-message';
import type { Token } from '$lib/types/token';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet
} from '$lib/utils/network.utils';
import { get } from 'svelte/store';

export const initBtcWalletWorker = async ({
	token: {
		id: tokenId,
		network: { id: networkId }
	},
	minterCanisterId
}: {
	token: Token;
	minterCanisterId?: OptionCanisterIdText;
}): Promise<WalletWorker> => {
	const WalletWorker = await import('$btc/workers/btc-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	const isTestnetNetwork = isNetworkIdBTCTestnet(networkId);
	const isRegtestNetwork = isNetworkIdBTCRegtest(networkId);

	worker.onmessage = ({ data }: MessageEvent<PostMessage<BtcPostMessageDataResponseWallet>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcWallet':
				syncWallet({
					tokenId,
					data: data.data as BtcPostMessageDataResponseWallet
				});
				return;

			case 'syncBtcWalletError':
				syncWalletError({
					tokenId,
					error: (data.data as PostMessageDataResponseError).error,
					// TODO: do not launch worker locally if BTC canister is not deployed, and remove the below param afterwards
					hideToast: isRegtestNetwork && LOCAL
				});
				return;
		}
	};

	const data = {
		// TODO: stop/start the worker on address change
		btcAddress: get(
			isTestnetNetwork
				? btcAddressTestnetStore
				: isRegtestNetwork
					? btcAddressRegtestStore
					: btcAddressMainnetStore
		),
		bitcoinNetwork: isTestnetNetwork ? 'testnet' : isRegtestNetwork ? 'regtest' : 'mainnet',
		// only mainnet transactions can be fetched via Blockchain API
		shouldFetchTransactions: isNetworkIdBTCMainnet(networkId),
		minterCanisterId
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startBtcWalletTimer',
				data
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopBtcWalletTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerBtcWalletTimer',
				data
			});
		}
	};
};
