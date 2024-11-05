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
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';
import type { SyncState } from '$lib/types/sync';

export const initCkBTCMinterInfoWorker: IcCkWorker = async (
	params
): Promise<IcCkWorkerInitResult> => {
	const CkBTCMinterInfoWorker = await import('$icp/workers/ckbtc-minter-info.worker?worker');
	const worker: Worker = new CkBTCMinterInfoWorker.default();

	return initCkMinterInfoWorker({
		worker,
		onSyncSuccess: syncCkBtcMinterInfo,
		onSyncError: syncCkBtcMinterError,
		onSyncStatus: syncCkBtcMinterStatus,
		...params
	});
};

export const initCkETHMinterInfoWorker: IcCkWorker = async (
	params
): Promise<IcCkWorkerInitResult> => {
	const CkETHMinterInfoWorker = await import('$icp/workers/cketh-minter-info.worker?worker');
	const worker: Worker = new CkETHMinterInfoWorker.default();

	return initCkMinterInfoWorker({
		worker,
		onSyncSuccess: syncCkEthMinterInfo,
		onSyncError: syncCkEthMinterError,
		onSyncStatus: syncCkEthMinterStatus,
		...params
	});
};

const initCkMinterInfoWorker = ({
	minterCanisterId,
	token: { id: tokenId },
	worker,
	onSyncSuccess,
	onSyncError,
	onSyncStatus
}: IcCkWorkerParams &
	Partial<IcCkMetadata> & {
		worker: Worker;
		onSyncSuccess: (params: SyncCkMinterInfoSuccess) => void;
		onSyncError: (params: SyncCkMinterInfoError) => void;
		onSyncStatus: (state: SyncState) => void;
	}): IcCkWorkerInitResult => {
	worker.onmessage = ({
		data
	}: MessageEvent<
		PostMessage<PostMessageJsonDataResponse | PostMessageDataResponseError | PostMessageSyncState>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncCkMinterInfo':
				onSyncSuccess({
					tokenId,
					data: data.data as PostMessageJsonDataResponse
				});
				return;
			case 'syncCkMinterInfoError':
				onSyncError({
					tokenId,
					error: (data.data as PostMessageDataResponseError).error
				});
				return;
			case 'syncCkMinterInfoStatus':
				onSyncStatus((data.data as PostMessageSyncState).state);
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startCkMinterInfoTimer',
				data: {
					minterCanisterId
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopCkMinterInfoTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerCkMinterInfoTimer',
				data: {
					minterCanisterId
				}
			});
		}
	};
};
