import {
	onLoadCkBtcMinterInfoError,
	syncCkBtcMinterInfo
} from '$icp/services/ckbtc-listener.services';
import type { CkBTCWorker, CkBTCWorkerInitResult } from '$icp/types/ckbtc-listener';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageJsonDataResponseCkBTC
} from '$lib/types/post-message';

export const initCkBTCMinterInfoWorker: CkBTCWorker = async ({
	minterCanisterId,
	id: tokenId
}: IcToken & Partial<IcCkCanisters>): Promise<CkBTCWorkerInitResult> => {
	const CkBTCMinterInfoWorker = await import('$icp/workers/ckbtc-minter-info.worker?worker');
	const worker: Worker = new CkBTCMinterInfoWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<PostMessageJsonDataResponseCkBTC | PostMessageDataResponseError>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncCktcMinterInfo':
				syncCkBtcMinterInfo({
					tokenId,
					data: data.data as PostMessageJsonDataResponseCkBTC
				});
				return;
			case 'syncCktcMinterInfoError':
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
