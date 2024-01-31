import { onLoadStatusesError, syncStatuses } from '$icp/services/btc-listener.services';
import type { BtcStatusesWorker } from '$icp/types/btc-listener';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import type {
	PostMessage,
	PostMessageDataResponseBtcStatuses,
	PostMessageDataResponseError
} from '$lib/types/post-message';

export const initBtcStatusesWorker = async ({
	minterCanisterId,
	id: tokenId
}: IcToken & Partial<IcCkCanisters>): Promise<BtcStatusesWorker> => {
	const BtcStatusesWorker = await import('$icp/workers/btc-statuses.worker?worker');
	const worker: Worker = new BtcStatusesWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<PostMessageDataResponseBtcStatuses | PostMessageDataResponseError>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcStatuses':
				syncStatuses({
					tokenId,
					data: data.data as PostMessageDataResponseBtcStatuses
				});
				return;
			case 'syncBtcStatusesError':
				onLoadStatusesError({
					tokenId,
					error: (data.data as PostMessageDataResponseError).error
				});
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startBtcStatusesTimer',
				data: {
					minterCanisterId
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopBtcStatusesTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerBtcStatusesTimer',
				data: {
					minterCanisterId
				}
			});
		}
	};
};
