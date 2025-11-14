import {
	syncCkBtcMinterError,
	syncCkBtcMinterInfo,
	syncCkBtcMinterStatus
} from '$icp/services/ckbtc-listener.services';
import {
	syncCkEthMinterError,
	syncCkEthMinterInfo,
	syncCkEthMinterStatus
} from '$icp/services/cketh-listener.services';
import type { SyncCkMinterInfoError, SyncCkMinterInfoSuccess } from '$icp/types/ck';
import type { IcCkWorker, IcCkWorkerInitResult, IcCkWorkerParams } from '$icp/types/ck-listener';
import type { IcCkMetadata } from '$icp/types/ic-token';
import { AppWorker } from '$lib/services/_worker.services';
import type {
	PostMessage,
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';
import type { SyncState } from '$lib/types/sync';
import type { TokenId } from '$lib/types/token';
import type { WorkerData } from '$lib/types/worker';

interface CkMinterInfoWorkerCallbacks {
	postMessageKey: 'CkBtc' | 'CkEth';
	onSyncSuccess: (params: SyncCkMinterInfoSuccess) => void;
	onSyncError: (params: SyncCkMinterInfoError) => void;
	onSyncStatus: (state: SyncState) => void;
}

export const initCkBTCMinterInfoWorker: IcCkWorker = (params): Promise<IcCkWorkerInitResult> =>
	CkMinterInfoWorker.init({
		postMessageKey: 'CkBtc',
		onSyncSuccess: syncCkBtcMinterInfo,
		onSyncError: syncCkBtcMinterError,
		onSyncStatus: syncCkBtcMinterStatus,
		...params
	});

export const initCkETHMinterInfoWorker: IcCkWorker = (params): Promise<IcCkWorkerInitResult> =>
	CkMinterInfoWorker.init({
		postMessageKey: 'CkEth',
		onSyncSuccess: syncCkEthMinterInfo,
		onSyncError: syncCkEthMinterError,
		onSyncStatus: syncCkEthMinterStatus,
		...params
	});

export class CkMinterInfoWorker extends AppWorker {
	private constructor(
		worker: WorkerData,
		private readonly tokenId: TokenId,
		private readonly minterCanisterId: IcCkWorkerParams['minterCanisterId'],
		private readonly postMessageKey: CkMinterInfoWorkerCallbacks['postMessageKey'],
		onSyncSuccess: CkMinterInfoWorkerCallbacks['onSyncSuccess'],
		onSyncError: CkMinterInfoWorkerCallbacks['onSyncError'],
		onSyncStatus: CkMinterInfoWorkerCallbacks['onSyncStatus']
	) {
		super(worker);

		this.setOnMessage(
			({
				data: dataMsg
			}: MessageEvent<
				PostMessage<
					PostMessageJsonDataResponse | PostMessageDataResponseError | PostMessageSyncState
				>
			>) => {
				const { msg, data } = dataMsg;

				switch (msg) {
					case 'syncCkMinterInfo':
						onSyncSuccess({
							tokenId,
							data: data as PostMessageJsonDataResponse
						});
						return;
					case 'syncCkMinterInfoError':
						onSyncError({
							tokenId,
							error: data.error
						});
						return;
					case 'syncCkMinterInfoStatus':
						onSyncStatus((data as PostMessageSyncState).state);
						return;
				}
			}
		);
	}

	static async init({
		minterCanisterId,
		token: { id: tokenId },
		postMessageKey,
		onSyncSuccess,
		onSyncError,
		onSyncStatus
	}: IcCkWorkerParams &
		Partial<IcCkMetadata> &
		CkMinterInfoWorkerCallbacks): Promise<CkMinterInfoWorker> {
		const worker = await AppWorker.getInstance();
		return new CkMinterInfoWorker(
			worker,
			tokenId,
			minterCanisterId,
			postMessageKey,
			onSyncSuccess,
			onSyncError,
			onSyncStatus
		);
	}

	protected override stopTimer = () => {
		this.postMessage({
			msg: `stop${this.postMessageKey}MinterInfoTimer`
		});
	};

	start = () => {
		this.postMessage<PostMessage<PostMessageDataRequestIcCk>>({
			msg: `start${this.postMessageKey}MinterInfoTimer`,
			data: {
				minterCanisterId: this.minterCanisterId
			}
		});
	};

	stop = () => {
		this.stopTimer();
	};

	trigger = () => {
		this.postMessage<PostMessage<PostMessageDataRequestIcCk>>({
			msg: `trigger${this.postMessageKey}MinterInfoTimer`,
			data: {
				minterCanisterId: this.minterCanisterId
			}
		});
	};
}
