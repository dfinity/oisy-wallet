import { BtcStatusesScheduler } from '$icp/schedulers/btc-statuses.scheduler';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';

const scheduler = new BtcStatusesScheduler();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcCk>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkBTCWalletTimer':
			scheduler.stop();
			return;
		case 'startCkBTCWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerCkBTCWalletTimer':
			await scheduler.trigger(data);
			return;
	}
};
