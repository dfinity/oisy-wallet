import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { AppWorker } from '$lib/services/_worker.services';
import { xrpAddressMainnetStore } from '$lib/stores/address.store';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataRequestXrp,
	PostMessageScheduler
} from '$lib/types/post-message';
import type { Token, TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';
import { syncWallet, syncWalletError } from '$xrp/services/xrp-listener.services';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export class XrpWalletWorker extends AppWorker implements WalletWorker {
	private constructor(
		worker: WorkerData,
		tokenId: TokenId,
		private readonly data: PostMessageDataRequestXrp
	) {
		super(worker);

		this.setOnMessage(
			({ data: dataMsg }: MessageEvent<PostMessageScheduler<XrpPostMessageDataResponseWallet>>) => {
				const { ref, msg, data } = dataMsg;

				// This is an additional guard because the worker may be initialised as a singleton;
				// we check that the message is intended for this worker and not another one.
				if (ref !== `${XRP_TOKEN.symbol}-${this.data.xrpNetwork}`) {
					return;
				}

				switch (msg) {
					case 'syncXrpWallet':
						syncWallet({
							tokenId,
							data: data as XrpPostMessageDataResponseWallet
						});
						return;

					case 'syncXrpWalletError':
						syncWalletError({
							tokenId,
							error: data.error,
							hideToast: true
						});
				}
			}
		);
	}

	static async init({ token }: { token: Token }): Promise<XrpWalletWorker> {
		const {
			id: tokenId,
			network: { id: networkId }
		} = token;

		// TODO: stop/start the worker on address change (same as for worker.btc-wallet.services.ts)
		const address = get(xrpAddressMainnetStore);
		assertNonNullish(address, 'No XRP address provided to start XRP wallet worker.');

		const network = mapNetworkIdToNetwork(networkId);
		assertNonNullish(network, 'No XRP network provided to start XRP wallet worker.');

		const data: PostMessageDataRequestXrp = {
			address,
			xrpNetwork: network
		};

		const worker = await AppWorker.getInstance();
		return new XrpWalletWorker(worker, tokenId, data);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopXrpWalletTimer'
		});
	};

	start = () => {
		this.postMessage<PostMessage<PostMessageDataRequestXrp>>({
			msg: 'startXrpWalletTimer',
			data: this.data
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage<PostMessage<PostMessageDataRequestXrp>>({
			msg: 'triggerXrpWalletTimer',
			data: this.data
		});
	};
}
