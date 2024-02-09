import { CkBTCMinterInfoScheduler } from '$icp/schedulers/ckbtc-minter-info.scheduler';
import type { PostMessage, PostMessageDataRequestCkBTC } from '$lib/types/post-message';

const scheduler = new CkBTCMinterInfoScheduler();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestCkBTC>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopCkBTCMinterInfoTimer':
			scheduler.stop();
			return;
		case 'startCkBTCMinterInfoTimer':
			await scheduler.start(data);
			return;
		case 'triggerCkBTCMinterInfoTimer':
			await scheduler.trigger(data);
			return;
	}
};
