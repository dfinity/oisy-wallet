import { syncWallet, syncWalletFromCache } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import type { IndexCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic-token';
import { AppWorker } from '$lib/services/_worker.services';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataRequestIcp,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';
import { assertNonNullish } from '@dfinity/utils';

export class IcpWalletWorker extends AppWorker implements WalletWorker {
	private constructor(
		worker: WorkerData,
		tokenId: TokenId,
		private readonly indexCanisterId: IndexCanisterIdText
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
					case 'syncIcpWallet':
						syncWallet({
							tokenId,
							data: data as PostMessageDataResponseWallet
						});
						return;
					case 'syncIcpWalletError':
						onLoadTransactionsError({
							tokenId,
							error: data.error
						});
						return;
					case 'syncIcpWalletCleanUp':
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
		id: tokenId,
		network: { id: networkId }
	}: IcToken): Promise<IcpWalletWorker> {
		// We typically have ICP-standard tokens only with index canister ID.
		// In the case of ICP-token without index canister ID, we cannot sync the wallet properly.
		assertNonNullish(indexCanisterId, 'Index Canister ID is required for ICP Wallet Worker');

		await syncWalletFromCache({ tokenId, networkId });

		const worker = await AppWorker.getInstance();
		return new IcpWalletWorker(worker, tokenId, indexCanisterId);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopIcpWalletTimer'
		});
	};

	start = () => {
		this.postMessage({
			msg: 'startIcpWalletTimer',
			data: {
				indexCanisterId: this.indexCanisterId
			}
		} as PostMessage<PostMessageDataRequestIcp>);
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage({
			msg: 'triggerIcpWalletTimer',
			data: {
				indexCanisterId: this.indexCanisterId
			}
		} as PostMessage<PostMessageDataRequestIcp>);
	};
}
