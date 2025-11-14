import { syncWallet, syncWalletFromCache } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import type { IcToken } from '$icp/types/ic-token';
import { AppWorker, type WorkerData } from '$lib/services/_worker.services';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataRequestIcrc,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

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
				PostMessage<
					| PostMessageDataResponseWallet
					| PostMessageDataResponseError
					| PostMessageDataResponseWalletCleanUp
				>
			>) => {
				const { msg, data } = dataMsg;

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

						// In case of error, we start the listener again, but only with the ledgerCanisterId,
						// to make it request only the balance and not the transactions
						if (nonNullish(indexCanisterId)) {
							this.restartWorkerWithLedgerOnly();
						}

						return;
					case 'syncIcrcWalletCleanUp':
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
		indexCanisterId,
		ledgerCanisterId,
		id: tokenId,
		network: { env, id: networkId }
	}: IcToken): Promise<IcrcWalletWorker> {
		await syncWalletFromCache({ tokenId, networkId });

		const worker = await AppWorker.getInstance();
		return new IcrcWalletWorker(worker, tokenId, ledgerCanisterId, indexCanisterId, env);
	}

	private restartedWithLedgerOnly = false;

	private restartWorkerWithLedgerOnly = () => {
		if (this.restartedWithLedgerOnly) {
			return;
		}

		this.restartedWithLedgerOnly = true;

		this.postMessage({
			msg: 'startIcrcWalletTimer',
			data: {
				ledgerCanisterId: this.ledgerCanisterId,
				env: this.env
			}
		});
	};

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopIcrcWalletTimer'
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
