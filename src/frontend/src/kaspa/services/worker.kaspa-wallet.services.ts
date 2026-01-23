import { KASPA_MAINNET_TOKEN } from '$env/tokens/tokens.kaspa.env';
import { AppWorker } from '$lib/services/_worker.services';
import {
	kaspaAddressMainnetStore,
	kaspaAddressTestnetStore
} from '$lib/stores/address.store';
import type { WalletWorker } from '$lib/types/listener';
import type { PostMessage } from '$lib/types/post-message';
import type { Token, TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';
import { isNetworkIdKaspaTestnet } from '$kaspa/utils/kaspa-network.utils';
import type { KaspaNetworkType } from '$kaspa/providers/kaspa-api.providers';
import {
	syncWallet,
	syncWalletError
} from '$kaspa/services/kaspa-listener.services';
import type {
	KaspaPostMessageDataResponseWallet,
	PostMessageDataRequestKaspa
} from '$kaspa/types/kaspa-post-message';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export class KaspaWalletWorker extends AppWorker implements WalletWorker {
	private constructor(
		worker: WorkerData,
		tokenId: TokenId,
		private readonly data: PostMessageDataRequestKaspa
	) {
		super(worker);

		this.setOnMessage(
			({ data: dataMsg }: MessageEvent<PostMessage<KaspaPostMessageDataResponseWallet>>) => {
				const { ref, msg, data } = dataMsg;

				// This is an additional guard because it may happen that the worker is initialised as a singleton.
				// In this case, we need to check if we should treat the message or if the message was intended for another worker.
				if (ref !== `${KASPA_MAINNET_TOKEN.symbol}-${this.data.kaspaNetwork}`) {
					return;
				}

				switch (msg) {
					case 'syncKaspaWallet':
						syncWallet({
							tokenId,
							data: data as KaspaPostMessageDataResponseWallet
						});
						return;

					case 'syncKaspaWalletError':
						syncWalletError({
							tokenId,
							error: data.error,
							hideToast: true
						});
				}
			}
		);
	}

	static async init({ token }: { token: Token }): Promise<KaspaWalletWorker> {
		const {
			id: tokenId,
			network: { id: networkId }
		} = token;

		const isTestnetNetwork = isNetworkIdKaspaTestnet(networkId);

		const address = get(isTestnetNetwork ? kaspaAddressTestnetStore : kaspaAddressMainnetStore);
		assertNonNullish(address, 'No Kaspa address provided to start Kaspa wallet worker.');

		const kaspaNetwork: KaspaNetworkType = isTestnetNetwork ? 'testnet' : 'mainnet';

		const data: PostMessageDataRequestKaspa = {
			address,
			kaspaNetwork
		};

		const worker = await AppWorker.getInstance();
		return new KaspaWalletWorker(worker, tokenId, data);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopKaspaWalletTimer'
		});
	};

	start = () => {
		this.postMessage<PostMessage<PostMessageDataRequestKaspa>>({
			msg: 'startKaspaWalletTimer',
			data: this.data
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage<PostMessage<PostMessageDataRequestKaspa>>({
			msg: 'triggerKaspaWalletTimer',
			data: this.data
		});
	};
}
