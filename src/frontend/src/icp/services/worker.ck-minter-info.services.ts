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

export const initCkBTCMinterInfoWorker: IcCkWorker = (params): Promise<IcCkWorkerInitResult> =>
	initCkMinterInfoWorker({
		postMessageKey: 'CkBtc',
		onSyncSuccess: syncCkBtcMinterInfo,
		onSyncError: syncCkBtcMinterError,
		onSyncStatus: syncCkBtcMinterStatus,
		...params
	});

export const initCkETHMinterInfoWorker: IcCkWorker = (params): Promise<IcCkWorkerInitResult> =>
	initCkMinterInfoWorker({
		postMessageKey: 'CkEth',
		onSyncSuccess: syncCkEthMinterInfo,
		onSyncError: syncCkEthMinterError,
		onSyncStatus: syncCkEthMinterStatus,
		...params
	});

const initCkMinterInfoWorker = async ({
	minterCanisterId,
	token: { id: tokenId },
	postMessageKey,
	onSyncSuccess,
	onSyncError,
	onSyncStatus
}: IcCkWorkerParams &
	Partial<IcCkMetadata> & {
		postMessageKey: 'CkBtc' | 'CkEth';
		onSyncSuccess: (params: SyncCkMinterInfoSuccess) => void;
		onSyncError: (params: SyncCkMinterInfoError) => void;
		onSyncStatus: (state: SyncState) => void;
	}): Promise<IcCkWorkerInitResult> => {
	const CkMinterInfoWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new CkMinterInfoWorker.default();

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
					error: data.data.error
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
				msg: `start${postMessageKey}MinterInfoTimer`,
				data: {
					minterCanisterId
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: `stop${postMessageKey}MinterInfoTimer`
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: `trigger${postMessageKey}MinterInfoTimer`,
				data: {
					minterCanisterId
				}
			});
		}
	};
};
