import {
	onLoadCkBtcMinterInfoError,
	syncCkMinterInfo
} from '$icp/services/ckbtc-listener.services';
import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse
} from '$lib/types/post-message';

export const initCkBTCMinterInfoWorker: IcCkWorker = async ({
	minterCanisterId,
	id: tokenId
}: IcToken & Partial<IcCkCanisters>): Promise<IcCkWorkerInitResult> => {
	const CkBTCMinterInfoWorker = await import('$icp/workers/ckbtc-minter-info.worker?worker');
	const worker: Worker = new CkBTCMinterInfoWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageJsonDataResponse | PostMessageDataResponseError>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncCkMinterInfo':
				syncCkMinterInfo({
					tokenId,
					data: data.data as PostMessageJsonDataResponse
				});
				return;
			case 'syncCkMinterInfoError':
				onLoadCkBtcMinterInfoError({
					tokenId,
					error: (data.data as PostMessageDataResponseError).error
				});
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startCkBTCMinterInfoTimer',
				data: {
					minterCanisterId
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopCkBTCMinterInfoTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerCkBTCMinterInfoTimer',
				data: {
					minterCanisterId
				}
			});
		}
	};
};
