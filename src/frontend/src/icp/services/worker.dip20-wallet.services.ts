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
	PostMessageDataRequestDip20,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';

export class Dip20WalletWorker extends AppWorker implements WalletWorker {
	private constructor(
		worker: WorkerData,
		tokenId: TokenId,
		private readonly canisterId: IcToken['ledgerCanisterId']
	) {
		super(worker);

		this.setOnMessage(
			({
				data: dataMsg
			}: MessageEvent<
				PostMessage<
					| PostMessageDataResponseWallet
					| PostMessageDataResponseError
					| PostMessageDataResponseWalletCleanUp
				>
			>) => {
				const { msg, ref, data } = dataMsg;

				// This is an additional guard because it may happen that the worker is initialised as a singleton.
				// In this case, we need to check if we should treat the message or if the message was intended for another worker.
				if (ref !== this.canisterId) {
					return;
				}

				switch (msg) {
					case 'syncDip20Wallet':
						syncWallet({
							tokenId,
							data: data as PostMessageDataResponseWallet
						});
						return;
					case 'syncDip20WalletError':
						onLoadTransactionsError({
							tokenId,
							error: data.error
						});

						return;
					case 'syncDip20WalletCleanUp':
						onTransactionsCleanUp({
							tokenId,
							transactionIds: (data as PostMessageDataResponseWalletCleanUp).transactionIds
						});
						return;
				}
			}
		);
	}

	static async init({
		ledgerCanisterId: canisterId,
		id: tokenId,
		network: { id: networkId }
	}: IcToken): Promise<Dip20WalletWorker> {
		await syncWalletFromCache({ tokenId, networkId });

		const worker = await AppWorker.getInstance();
		return new Dip20WalletWorker(worker, tokenId, canisterId);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopDip20WalletTimer'
		});
	};

	start = () => {
		this.postMessage<PostMessage<PostMessageDataRequestDip20>>({
			msg: 'startDip20WalletTimer',
			data: {
				canisterId: this.canisterId
			}
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage<PostMessage<PostMessageDataRequestDip20>>({
			msg: 'triggerDip20WalletTimer',
			data: {
				canisterId: this.canisterId
			}
		});
	};
}
