import { BtcStatusesWorkerUtils } from '$icp/worker-utils/btc-statuses.worker-utils';
import type { PostMessage, PostMessageDataRequestBtcStatuses } from '$lib/types/post-message';

const worker = new BtcStatusesWorkerUtils();

onmessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestBtcStatuses>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopBtcStatusesTimer':
			worker.stop();
			return;
		case 'startBtcStatusesTimer':
			await worker.start(data);
			return;
		case 'triggerBtcStatusesTimer':
			await worker.trigger(data);
			return;
	}
};
