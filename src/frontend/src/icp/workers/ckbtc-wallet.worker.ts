import { BtcStatusesWorkerUtils } from '$icp/worker-utils/btc-statuses.worker-utils';
import type { PostMessage, PostMessageDataRequestCkBTCWallet } from '$lib/types/post-message';

const worker = new BtcStatusesWorkerUtils();

onmessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestCkBTCWallet>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkBTCWalletTimer':
			worker.stop();
			return;
		case 'startCkBTCWalletTimer':
			await worker.start(data);
			return;
		case 'triggerCkBTCWalletTimer':
			await worker.trigger(data);
			return;
	}
};
