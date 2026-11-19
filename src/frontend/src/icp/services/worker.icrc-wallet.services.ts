import { syncWallet, syncWalletFromCache } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import type { IcToken } from '$icp/types/ic-token';
import { AppWorker } from '$lib/services/_worker.services';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataRequestIcrc,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp,
	PostMessageScheduler
} from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';

export class IcrcWalletWorker extends AppWorker implements WalletWorker {
	private constructor(
		worker: WorkerData,
		tokenId: TokenId,
		private readonly ledgerCanisterId: IcToken['ledgerCanisterId'],
		private readonly indexCanisterId: IcToken['indexCanisterId'],
		private readonly env: IcToken['network']['env']
	) {
		super(worker);

		this.setOnMessage(
			({
				data: dataMsg
			}: MessageEvent<
				PostMessageScheduler<
					| PostMessageDataResponseWallet
					| PostMessageDataResponseError
					| PostMessageDataResponseWalletCleanUp
				>
			>) => {
				const { ref, msg, data } = dataMsg;

				// This is an additional guard because it may happen that the worker is initialised as a singleton.
				// In this case, we need to check if we should treat the message or if the message was intended for another worker.
				if (ref !== this.ledgerCanisterId) {
					return;
				}

				switch (msg) {
					case 'syncIcrcWallet':
						syncWallet({
							tokenId,
							data: data as PostMessageDataResponseWallet
						});
						return;
					case 'syncIcrcWalletError':
						onLoadTransactionsError({
							tokenId,
							error: data.error
						});
						return;
					case 'syncIcrcWalletCleanUp':
						onTransactionsCleanUp({
							tokenId,
							transactionIds: (data as PostMessageDataResponseWalletCleanUp).transactionIds
						});
				}
			}
		);
	}

	static async init({
		indexCanisterId,
		ledgerCanisterId,
		id: tokenId,
		network: { env, id: networkId }
	}: IcToken): Promise<IcrcWalletWorker> {
		await syncWalletFromCache({ tokenId, networkId });

		const worker = await AppWorker.getInstance({ pooled: true, poolKey: ledgerCanisterId });
		return new IcrcWalletWorker(worker, tokenId, ledgerCanisterId, indexCanisterId, env);
	}

	protected override stopTimer = () => {
		this.postMessage<PostMessage<PostMessageDataRequestIcrc>>({
			msg: 'stopIcrcWalletTimer',
			data: {
				ledgerCanisterId: this.ledgerCanisterId,
				env: this.env
			}
		});
	};

	start = () => {
		this.postMessage<PostMessage<PostMessageDataRequestIcrc>>({
			msg: 'startIcrcWalletTimer',
			data: {
				indexCanisterId: this.indexCanisterId,
				ledgerCanisterId: this.ledgerCanisterId,
				env: this.env
			}
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage<PostMessage<PostMessageDataRequestIcrc>>({
			msg: 'triggerIcrcWalletTimer',
			data: {
				indexCanisterId: this.indexCanisterId,
				ledgerCanisterId: this.ledgerCanisterId,
				env: this.env
			}
		});
	};
}
