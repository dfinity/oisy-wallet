import { onLoadBtcStatusesError, syncBtcStatuses } from '$icp/services/ckbtc-listener.services';
import type { IcCkWorkerParams } from '$icp/types/ck-listener';
import { AppWorker, type WorkerData } from '$lib/services/_worker.services';
import type {
	PostMessage,
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';

export class BtcStatusesWorker extends AppWorker {
	private constructor(
		worker: WorkerData,
		tokenId: TokenId,
		private readonly minterCanisterId: IcCkWorkerParams['minterCanisterId']
	) {
		super(worker);

		this.setOnMessage(
			({
				data: dataMsg
			}: MessageEvent<
				PostMessage<
					PostMessageJsonDataResponse | PostMessageSyncState | PostMessageDataResponseError
				>
			>) => {
				const { msg, data } = dataMsg;

				switch (msg) {
					case 'syncBtcStatuses':
						syncBtcStatuses({
							tokenId,
							data: data as PostMessageJsonDataResponse
						});
						return;
					case 'syncBtcStatusesError':
						onLoadBtcStatusesError({
							tokenId,
							error: data.error
						});
						return;
				}
			}
		);
	}

	static async init({
		minterCanisterId,
		token: { id: tokenId }
	}: IcCkWorkerParams): Promise<BtcStatusesWorker> {
		const worker = await AppWorker.getInstance();
		return new BtcStatusesWorker(worker, tokenId, minterCanisterId);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: 'stopBtcStatusesTimer'
		});
	};

	start = () => {
		this.postMessage({
			msg: 'startBtcStatusesTimer',
			data: {
				minterCanisterId: this.minterCanisterId
			}
		} as PostMessage<PostMessageDataRequestIcCk>);
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage({
			msg: 'triggerBtcStatusesTimer',
			data: {
				minterCanisterId: this.minterCanisterId
			}
		} as PostMessage<PostMessageDataRequestIcCk>);
	};
}
