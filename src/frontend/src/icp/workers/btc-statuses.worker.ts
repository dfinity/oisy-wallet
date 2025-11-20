import { BtcStatusesScheduler } from '$icp/schedulers/btc-statuses.scheduler';
import type { PostMessage, PostMessageDataRequestIcCk } from '$lib/types/post-message';

const scheduler = new BtcStatusesScheduler();

export const onBtcStatusesMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestIcCk>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopBtcStatusesTimer':
			scheduler.stop();
			return;
		case 'startBtcStatusesTimer':
			await scheduler.start(data);
			return;
		case 'triggerBtcStatusesTimer':
			await scheduler.trigger(data);
	}
};
