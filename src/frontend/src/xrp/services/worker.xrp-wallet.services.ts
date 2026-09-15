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
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export class XrpWalletWorker extends AppWorker implements WalletWorker {
	#unsubscribeAddress: (() => void) | undefined;

	private constructor(
		worker: WorkerData,
		tokenId: TokenId,
		private readonly xrpNetwork: XrpNetworkType
	) {
		super(worker);

		this.setOnMessage(
			({ data: dataMsg }: MessageEvent<PostMessageScheduler<XrpPostMessageDataResponseWallet>>) => {
				const { ref, msg, data } = dataMsg;

				// This is an additional guard because the worker may be initialised as a singleton;
				// we check that the message is intended for this worker and not another one. The ref
				// carries the address, so a sync for a superseded address is dropped.
				if (ref !== this.#ref()) {
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

		assertNonNullish(
			get(xrpAddressMainnetStore),
			'No XRP address provided to start XRP wallet worker.'
		);

		const network = mapNetworkIdToNetwork(networkId);
		assertNonNullish(network, 'No XRP network provided to start XRP wallet worker.');

		const worker = await AppWorker.getInstance();
		return new XrpWalletWorker(worker, tokenId, network);
	}

	// `xrpAddressMainnetStore` is the single source of truth for the address: the payload is rebuilt
	// on every post instead of captured at init, so the worker cannot poll a superseded address.
	#data = (): PostMessageDataRequestXrp | undefined => {
		const address = get(xrpAddressMainnetStore);

		return isNullish(address) ? undefined : { address, xrpNetwork: this.xrpNetwork };
	};

	#ref = (): string | undefined => {
		const address = get(xrpAddressMainnetStore);

		return isNullish(address)
			? undefined
			: `${XRP_TOKEN.symbol}-${this.xrpNetwork}-${address.data}`;
	};

	// Reading the store per post keeps `start`/`trigger` current, but the timer inside the worker
	// polls with whatever it last received. Restarting it on a change is what stops that snapshot
	// from outliving the address it was taken for.
	#watchAddress = () => {
		let previous = get(xrpAddressMainnetStore)?.data;

		this.#unsubscribeAddress = xrpAddressMainnetStore.subscribe((address) => {
			if (address?.data === previous) {
				return;
			}

			previous = address?.data;

			if (isNullish(address)) {
				this.stopTimer();
				return;
			}

			// `SchedulerTimer.start` is a no-op while its timer exists, so the running timer has to be
			// cleared first or it would keep polling the previous address under the new ref.
			this.stopTimer();
			this.start();
		});
	};

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopXrpWalletTimer'
		});
	};

	start = () => {
		const data = this.#data();

		if (isNullish(data)) {
			return;
		}

		if (isNullish(this.#unsubscribeAddress)) {
			this.#watchAddress();
		}

		this.postMessage<PostMessage<PostMessageDataRequestXrp>>({
			msg: 'startXrpWalletTimer',
			data
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		const data = this.#data();

		if (isNullish(data)) {
			return;
		}

		this.postMessage<PostMessage<PostMessageDataRequestXrp>>({
			msg: 'triggerXrpWalletTimer',
			data
		});
	};

	// `AppWorker.destroy` is a class field rather than a prototype method, so it cannot be reached
	// through `super`. Its two steps are replicated here instead; `terminate` is idempotent.
	destroy = () => {
		this.#unsubscribeAddress?.();
		this.#unsubscribeAddress = undefined;

		this.stopTimer();
		this.terminate();
	};
}
